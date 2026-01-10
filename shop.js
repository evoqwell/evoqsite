import { fetchProducts } from './lib/api.js';
import { openAddToCartModal, openProductDetailsModal } from './lib/productModals.js';

// Hide dash separators that appear at line breaks
function adjustCategorySeparators() {
  document.querySelectorAll('.product-categories').forEach((container) => {
    const separators = container.querySelectorAll('.category-separator');
    const chips = container.querySelectorAll('.product-category-chip');

    // Show all separators first (reset display)
    separators.forEach((sep) => (sep.style.display = ''));

    // Check each separator's position relative to adjacent chips
    separators.forEach((sep, index) => {
      const prevChip = chips[index];
      const nextChip = chips[index + 1];

      if (prevChip && nextChip) {
        const prevRect = prevChip.getBoundingClientRect();
        const nextRect = nextChip.getBoundingClientRect();

        // If next chip is on a different line, hide the dash completely
        if (Math.abs(prevRect.top - nextRect.top) > 5) {
          sep.style.display = 'none';
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  // Re-adjust separators on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(adjustCategorySeparators, 100);
  });
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

    // Adjust category separators after cards are in DOM
    requestAnimationFrame(adjustCategorySeparators);
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
  const isComingSoon = product.status === 'coming_soon';

  card.className = 'product-card fade-in';
  card.dataset.productId = product.id;
  if (isOutOfStock) {
    card.classList.add('out-of-stock');
  }
  if (isComingSoon) {
    card.classList.add('coming-soon');
  }

  // Image wrapper with optional status ribbon
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'product-image-wrapper';

  if (isComingSoon) {
    const ribbon = document.createElement('span');
    ribbon.className = 'product-ribbon coming-soon';
    ribbon.textContent = 'Coming Soon';
    imageWrapper.appendChild(ribbon);
  } else if (isOutOfStock) {
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

  // Product info section
  const info = document.createElement('div');
  info.className = 'product-info';

  // Category chips (show all)
  const categories = createProductCategories(product);
  if (categories) {
    info.appendChild(categories);
  }

  // Product header (name + price for mobile inline layout)
  const header = document.createElement('div');
  header.className = 'product-header';

  // Product name with styled unit
  const title = document.createElement('h3');
  title.className = 'product-name';

  // Parse name to style unit (mg, ml, etc.) differently
  const unitMatch = product.name.match(/^(.+?\s*)(\d+)\s*(mg|ml|mcg|iu)$/i);
  if (unitMatch) {
    const [, prefix, amount, unit] = unitMatch;
    title.appendChild(document.createTextNode(prefix + amount + ' '));
    const unitSpan = document.createElement('span');
    unitSpan.className = 'product-unit';
    unitSpan.textContent = unit;
    title.appendChild(unitSpan);
  } else {
    title.textContent = product.name;
  }
  header.appendChild(title);

  // Price in header (visible on mobile, hidden on desktop)
  const headerPrice = document.createElement('span');
  headerPrice.className = 'product-price product-price-header';
  headerPrice.textContent = `$${Number(product.price).toFixed(2)}`;
  header.appendChild(headerPrice);

  info.appendChild(header);

  // Footer with price and actions
  const footer = document.createElement('div');
  footer.className = 'product-footer';

  // Price
  const priceEl = document.createElement('span');
  priceEl.className = 'product-price';
  priceEl.textContent = `$${Number(product.price).toFixed(2)}`;
  footer.appendChild(priceEl);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'product-actions';

  // View Details link
  const viewDetails = document.createElement('button');
  viewDetails.className = 'btn-view-details';
  viewDetails.type = 'button';
  viewDetails.textContent = 'Details';
  viewDetails.addEventListener('click', () => openProductDetailsModal(product));
  actions.appendChild(viewDetails);

  // Add to Cart button
  const addToCartBtn = document.createElement('button');
  addToCartBtn.className = 'btn-add-cart';
  addToCartBtn.type = 'button';
  if (isComingSoon) {
    addToCartBtn.disabled = true;
    addToCartBtn.setAttribute('aria-disabled', 'true');
    addToCartBtn.textContent = 'Coming Soon';
  } else if (isOutOfStock) {
    addToCartBtn.disabled = true;
    addToCartBtn.setAttribute('aria-disabled', 'true');
    addToCartBtn.textContent = 'Sold Out';
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

  categories.forEach((category, index) => {
    const chip = document.createElement('span');
    chip.className = 'product-category-chip';
    chip.textContent = category;
    container.appendChild(chip);

    // Add separator (except after last item)
    if (index < categories.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'category-separator';
      container.appendChild(sep);
    }
  });

  return container;
}

function renderLoading(container) {
  const skeletonCount = 6;
  let skeletonHTML = '<div class="skeleton-container">';

  for (let i = 0; i < skeletonCount; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-info">
          <div class="skeleton-chips">
            <div class="skeleton skeleton-chip"></div>
            <div class="skeleton skeleton-chip"></div>
          </div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton-footer">
            <div class="skeleton skeleton-price"></div>
            <div class="skeleton skeleton-button"></div>
          </div>
        </div>
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
