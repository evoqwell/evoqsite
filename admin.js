import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  fetchAdminPromos,
  createAdminPromo,
  updateAdminPromo,
  deleteAdminPromo,
  fetchAdminOrders,
  updateAdminOrderStatus
} from './lib/adminApi.js';

let adminToken = '';
let activeTab = 'products';
let lastLoadedData = {
  products: [],
  promos: [],
  orders: []
};
let currentOrderPage = 1;
const ORDERS_PER_PAGE = 10;

const tabButtons = Array.from(document.querySelectorAll('[data-admin-tab]'));
const tabPanels = Array.from(document.querySelectorAll('[data-admin-panel]'));

const statusBar = document.getElementById('admin-status');
const connectForm = document.getElementById('admin-connect-form');
const tokenInput = document.getElementById('admin-token');
const productsContainer = document.getElementById('admin-products');
const promosContainer = document.getElementById('admin-promos');
const ordersContainer = document.getElementById('admin-orders');
const productCreateForm = document.getElementById('admin-create-product-form');
const promoCreateForm = document.getElementById('admin-create-promo-form');

document.addEventListener('DOMContentLoaded', () => {
  initializeAdmin();
});

// Global error handlers to prevent unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[admin] Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default browser error handling
  if (event.reason?.message) {
    showStatus(`Error: ${event.reason.message}`, 'error');
  }
});

window.addEventListener('error', (event) => {
  console.error('[admin] Global error:', event.error);
});

function parseCategoriesInput(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatCategoriesForInput(product) {
  if (Array.isArray(product?.categories) && product.categories.length > 0) {
    return product.categories.join(', ');
  }
  return product?.category || '';
}

function initializeAdmin() {
  if (connectForm) {
    connectForm.addEventListener('submit', handleConnect);
  }

  const savedToken = sessionStorage.getItem('evoq_admin_token');
  if (savedToken) {
    tokenInput.value = savedToken;
    adminToken = savedToken;
    loadDashboard();
  }

  if (productCreateForm) {
    productCreateForm.addEventListener('submit', handleCreateProduct);
  }

  if (promoCreateForm) {
    promoCreateForm.addEventListener('submit', handleCreatePromo);
  }

  const storedTab = sessionStorage.getItem('evoq_admin_tab');
  if (storedTab) {
    activeTab = storedTab;
  }

  if (!tabButtons.some((button) => button.dataset.adminTab === activeTab)) {
    activeTab = 'products';
  }

  setupTabs();
  setActiveTab(activeTab);
}

async function handleConnect(event) {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) {
    showStatus('Please enter the admin access token.', 'error');
    return;
  }

  adminToken = token;
  sessionStorage.setItem('evoq_admin_token', token);
  await loadDashboard();
}

async function loadDashboard() {
  if (!adminToken) {
    showStatus('Enter admin token to begin.', 'info');
    return;
  }
  showStatus('Loading admin data...', 'info');
  try {
    const [productsRes, promosRes, ordersRes] = await Promise.all([
      fetchAdminProducts(adminToken),
      fetchAdminPromos(adminToken),
      fetchAdminOrders(adminToken)
    ]);

    lastLoadedData = {
      products: productsRes?.products || [],
      promos: promosRes?.promos || [],
      orders: ordersRes?.orders || []
    };

    renderProducts(lastLoadedData.products);
    renderPromos(lastLoadedData.promos);
    renderOrders(lastLoadedData.orders);
    showStatus('Admin data loaded.');
  } catch (error) {
    console.error('[admin] Failed to load dashboard', error);
    showStatus(error.message || 'Failed to load admin data.', 'error');
    if (error.status === 401) {
      sessionStorage.removeItem('evoq_admin_token');
      adminToken = '';
      if (tokenInput) {
        tokenInput.focus();
        tokenInput.select();
      }
    }
  }
}

function renderProducts(products) {
  if (!productsContainer) return;

  if (!products.length) {
    productsContainer.innerHTML = '<p class="admin-empty">No products found.</p>';
    return;
  }

  productsContainer.innerHTML = '';

  // Create list container
  const listContainer = document.createElement('div');
  listContainer.className = 'admin-list-container';

  products.forEach((product) => {
    const listItem = document.createElement('div');
    listItem.className = 'admin-list-item';
    listItem.dataset.sku = product.sku;

    // Create summary section
    const summary = document.createElement('div');
    summary.className = 'admin-list-summary';

    const stockBadgeClass = product.stock > 0 ? 'success' : 'danger';
    const stockText = product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock';
    const activeBadgeClass = product.isActive ? 'success' : '';

    summary.innerHTML = `
      <div class="admin-list-summary-content">
        <h3 class="admin-list-title">${escapeHtml(product.name)}</h3>
        <div class="admin-list-meta">
          <span>SKU: ${escapeHtml(product.sku)}</span>
          <span>$${Number(product.price).toFixed(2)}</span>
          <span class="admin-list-badge ${stockBadgeClass}">${stockText}</span>
          ${product.isActive ? '<span class="admin-list-badge success">Active</span>' : '<span class="admin-list-badge">Inactive</span>'}
        </div>
      </div>
      <svg class="admin-list-expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;

    // Create details section with form
    const details = document.createElement('div');
    details.className = 'admin-list-details';

    const form = document.createElement('form');
    form.className = 'admin-list-details-form';
    const categoriesValue = escapeHtml(formatCategoriesForInput(product));

    form.innerHTML = `
      <div class="admin-card-body">
        <label>
          Name
          <input type="text" name="name" value="${escapeHtml(product.name)}" required>
        </label>
        <label>
          Description
          <textarea name="description" rows="3">${escapeHtml(product.description || '')}</textarea>
        </label>
        <div class="admin-grid">
          <label>
            Price (USD)
            <input type="number" name="price" min="0" step="0.01" value="${Number(product.price).toFixed(2)}" required>
          </label>
          <label>
            Stock
            <input type="number" name="stock" min="0" step="1" value="${Number(product.stock || 0)}">
          </label>
        </div>
        <label>
          Image Path
          <input type="text" name="image" value="${escapeHtml(product.image || '')}">
        </label>
        <label>
          Categories
          <input type="text" name="categories" value="${categoriesValue}" placeholder="e.g., Skin, Metabolism">
        </label>
        <label>
          COA File Path
          <input type="text" name="coa" value="${escapeHtml(product.coa || '')}" placeholder="/COAs/filename.pdf">
        </label>
        <label class="admin-inline">
          <input type="checkbox" name="isActive" ${product.isActive ? 'checked' : ''}>
          Active
        </label>
      </div>
      <footer class="admin-list-actions">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-danger" data-action="delete">Delete</button>
      </footer>
    `;

    // Add event listeners
    summary.addEventListener('click', () => {
      listItem.classList.toggle('expanded');
    });

    form.addEventListener('submit', (event) => handleUpdateProduct(event, product.sku));
    const deleteBtn = form.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', () => handleDeleteProduct(product.sku));

    details.appendChild(form);
    listItem.appendChild(summary);
    listItem.appendChild(details);
    listContainer.appendChild(listItem);
  });

  productsContainer.appendChild(listContainer);
}

function renderPromos(promos) {
  if (!promosContainer) return;

  if (!promos.length) {
    promosContainer.innerHTML = '<p class="admin-empty">No promo codes found.</p>';
    return;
  }

  promosContainer.innerHTML = '';
  promos.forEach((promo) => {
    const form = document.createElement('form');
    form.className = 'admin-card';
    form.dataset.code = promo.code;
    form.innerHTML = `
      <header class="admin-card-header">
        <h3>${escapeHtml(promo.code)}</h3>
      </header>
      <div class="admin-card-body">
        <label>
          Description
          <textarea name="description" rows="2">${escapeHtml(promo.description || '')}</textarea>
        </label>
        <div class="admin-grid">
          <label>
            Discount Type
            <select name="discountType">
              <option value="percentage" ${promo.discountType === 'percentage' ? 'selected' : ''}>Percentage</option>
              <option value="fixed" ${promo.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
            </select>
          </label>
          <label>
            Discount Value
            <input type="number" name="discountValue" min="0" step="0.01" value="${Number(promo.discountValue).toFixed(2)}" required>
          </label>
        </div>
        <label class="admin-inline">
          <input type="checkbox" name="isActive" ${promo.isActive ? 'checked' : ''}>
          Active
        </label>
      </div>
      <footer class="admin-card-actions">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-danger" data-action="delete">Delete</button>
      </footer>
    `;

    form.addEventListener('submit', (event) => handleUpdatePromo(event, promo.code));
    const deleteBtn = form.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', () => handleDeletePromo(promo.code));
    promosContainer.appendChild(form);
  });
}

function renderOrders(orders) {
  if (!ordersContainer) return;

  if (!orders.length) {
    ordersContainer.innerHTML = '<p class="admin-empty">No orders yet.</p>';
    return;
  }

  ordersContainer.innerHTML = '';

  // Calculate pagination
  const totalOrders = orders.length;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
  const startIndex = (currentOrderPage - 1) * ORDERS_PER_PAGE;
  const endIndex = Math.min(startIndex + ORDERS_PER_PAGE, totalOrders);
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Create list container
  const listContainer = document.createElement('div');
  listContainer.className = 'admin-list-container';

  paginatedOrders.forEach((order) => {
    const listItem = document.createElement('div');
    listItem.className = 'admin-list-item';
    listItem.dataset.orderNumber = order.orderNumber;

    // Create summary section
    const summary = document.createElement('div');
    summary.className = 'admin-list-summary';

    const statusBadgeClass = {
      pending_payment: 'warning',
      paid: 'info',
      fulfilled: 'success',
      cancelled: 'danger'
    }[order.status] || '';

    const statusDisplay = order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    summary.innerHTML = `
      <div class="admin-list-summary-content">
        <h3 class="admin-list-title">Order #${order.orderNumber}</h3>
        <div class="admin-list-meta">
          <span>${escapeHtml(order.customer.name)}</span>
          <span>$${Number(order.totals.total).toFixed(2)}</span>
          <span>${new Date(order.createdAt).toLocaleDateString()}</span>
          <span class="admin-list-badge ${statusBadgeClass}">${statusDisplay}</span>
        </div>
      </div>
      <svg class="admin-list-expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;

    // Create details section
    const details = document.createElement('div');
    details.className = 'admin-list-details';

    const itemsList = order.items
      .map(
        (item) =>
          `<li>${escapeHtml(item.name)} x ${item.quantity} - $${Number(item.lineTotal).toFixed(2)}</li>`
      )
      .join('');

    const statusOptions = ['pending_payment', 'paid', 'fulfilled', 'cancelled']
      .map(
        (status) =>
          `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`
      )
      .join('');

    details.innerHTML = `
      <div class="admin-list-details-form">
        <div class="admin-card-body">
          <div class="admin-grid">
            <div>
              <label>
                Order Status
                <select data-order-status="${order.orderNumber}">
                  ${statusOptions}
                </select>
              </label>
              <button type="button" class="btn-primary" data-update-status="${order.orderNumber}" style="margin-top: 8px;">
                Update Status
              </button>
            </div>
            <div>
              <strong>Order Date:</strong><br>
              ${new Date(order.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <strong>Customer Information:</strong><br>
            ${escapeHtml(order.customer.name)}<br>
            ${escapeHtml(order.customer.email)}<br>
            ${order.customer.phone ? escapeHtml(order.customer.phone) + '<br>' : ''}
          </div>

          <div>
            <strong>Shipping Address:</strong><br>
            ${escapeHtml(order.customer.address)}<br>
            ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zip)}
          </div>

          <div>
            <strong>Order Items:</strong>
            <ul class="admin-order-list">${itemsList}</ul>
          </div>

          <div class="admin-grid">
            <div>
              <strong>Subtotal:</strong> $${Number(order.totals.subtotal).toFixed(2)}<br>
              <strong>Shipping:</strong> $${Number(order.totals.shipping).toFixed(2)}<br>
              ${order.totals.discount ? `<strong>Discount:</strong> -$${Number(order.totals.discount).toFixed(2)}<br>` : ''}
              <strong>Total:</strong> $${Number(order.totals.total).toFixed(2)}
            </div>
            <div>
              ${order.promoCode ? `<strong>Promo Code:</strong> ${escapeHtml(order.promoCode)}<br>` : ''}
              ${order.venmoNote ? `<strong>Venmo Note:</strong> ${escapeHtml(order.venmoNote)}` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    summary.addEventListener('click', () => {
      listItem.classList.toggle('expanded');
    });

    const select = details.querySelector(`[data-order-status="${order.orderNumber}"]`);
    const updateBtn = details.querySelector(`[data-update-status="${order.orderNumber}"]`);

    updateBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const newStatus = select.value;
      const originalStatus = order.status;

      if (newStatus === originalStatus) {
        showStatus('Status is already set to this value.', 'info');
        return;
      }

      updateBtn.disabled = true;
      updateBtn.textContent = 'Updating...';

      handleUpdateOrderStatus(order.orderNumber, newStatus)
        .then(() => {
          updateBtn.textContent = 'Updated!';
          order.status = newStatus; // Update local reference

          // Update the badge in the summary section
          const statusBadge = listItem.querySelector('.admin-list-meta .admin-list-badge:last-child');
          if (statusBadge) {
            const statusBadgeClasses = {
              pending_payment: 'warning',
              paid: 'info',
              fulfilled: 'success',
              cancelled: 'danger'
            };
            const displayStatus = newStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Remove old status classes
            statusBadge.className = 'admin-list-badge';
            // Add new status class
            const badgeClass = statusBadgeClasses[newStatus] || '';
            if (badgeClass) {
              statusBadge.classList.add(badgeClass);
            }
            statusBadge.textContent = displayStatus;
          }

          setTimeout(() => {
            updateBtn.textContent = 'Update Status';
            updateBtn.disabled = false;
          }, 2000);
        })
        .catch((error) => {
          console.error('[admin] Status update failed:', error);
          updateBtn.textContent = 'Update Status';
          updateBtn.disabled = false;
          // Revert select to original status on error
          select.value = originalStatus;
        });
    });

    listItem.appendChild(summary);
    listItem.appendChild(details);
    listContainer.appendChild(listItem);
  });

  ordersContainer.appendChild(listContainer);

  // Add pagination controls if needed
  if (totalPages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'admin-pagination';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = currentOrderPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentOrderPage > 1) {
        currentOrderPage--;
        renderOrders(orders);
      }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentOrderPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = i === currentOrderPage ? 'active' : '';
      pageBtn.addEventListener('click', () => {
        currentOrderPage = i;
        renderOrders(orders);
      });
      pagination.appendChild(pageBtn);
    }

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'admin-pagination-info';
    pageInfo.textContent = `${startIndex + 1}-${endIndex} of ${totalOrders} orders`;
    pagination.appendChild(pageInfo);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentOrderPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentOrderPage < totalPages) {
        currentOrderPage++;
        renderOrders(orders);
      }
    });
    pagination.appendChild(nextBtn);

    ordersContainer.appendChild(pagination);
  }
}

async function handleCreateProduct(event) {
  event.preventDefault();
  if (!adminToken) {
    showStatus('Enter admin token before managing products.', 'error');
    return;
  }

  const formData = new FormData(event.target);
  const categories = parseCategoriesInput(formData.get('categories')?.toString() || '');
  const payload = {
    sku: formData.get('sku').trim(),
    name: formData.get('name').trim(),
    description: formData.get('description').trim(),
    price: parseFloat(formData.get('price')),
    image: formData.get('image').trim(),
    categories,
    category: categories[0] || '',
    coa: formData.get('coa').trim(),
    stock: parseInt(formData.get('stock'), 10) || 0,
    isActive: formData.get('isActive') === 'on'
  };

  if (!payload.sku || !payload.name || Number.isNaN(payload.price)) {
    showStatus('SKU, name, and price are required to create a product.', 'error');
    return;
  }

  try {
    await createAdminProduct(adminToken, payload);
    event.target.reset();
    showStatus(`Product ${payload.sku} created.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to create product', error);
    showStatus(error.message || 'Failed to create product.', 'error');
  }
}

async function handleUpdateProduct(event, sku) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const categories = parseCategoriesInput(formData.get('categories')?.toString() || '');
  const payload = {
    name: formData.get('name').trim(),
    description: formData.get('description').trim(),
    price: parseFloat(formData.get('price')),
    image: formData.get('image').trim(),
    categories,
    category: categories[0] || '',
    coa: formData.get('coa').trim(),
    stock: parseInt(formData.get('stock'), 10) || 0,
    isActive: formData.get('isActive') === 'on'
  };

  if (!payload.name || Number.isNaN(payload.price)) {
    showStatus('Name and price are required.', 'error');
    return;
  }

  try {
    await updateAdminProduct(adminToken, sku, payload);
    showStatus(`Product ${sku} updated.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to update product', error);
    showStatus(error.message || 'Failed to update product.', 'error');
  }
}

async function handleDeleteProduct(sku) {
  if (!confirm(`Delete product ${sku}? This cannot be undone.`)) {
    return;
  }
  try {
    await deleteAdminProduct(adminToken, sku);
    showStatus(`Product ${sku} deleted.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to delete product', error);
    showStatus(error.message || 'Failed to delete product.', 'error');
  }
}

async function handleCreatePromo(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = {
    code: formData.get('code').trim().toUpperCase(),
    description: formData.get('description').trim(),
    discountType: formData.get('discountType'),
    discountValue: parseFloat(formData.get('discountValue')),
    isActive: formData.get('isActive') === 'on'
  };

  if (!payload.code || Number.isNaN(payload.discountValue)) {
    showStatus('Code and discount value are required.', 'error');
    return;
  }

  try {
    await createAdminPromo(adminToken, payload);
    event.target.reset();
    showStatus(`Promo ${payload.code} created.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to create promo', error);
    showStatus(error.message || 'Failed to create promo.', 'error');
  }
}

async function handleUpdatePromo(event, code) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    description: formData.get('description').trim(),
    discountType: formData.get('discountType'),
    discountValue: parseFloat(formData.get('discountValue')),
    isActive: formData.get('isActive') === 'on'
  };

  if (Number.isNaN(payload.discountValue)) {
    showStatus('Discount value must be a number.', 'error');
    return;
  }

  try {
    await updateAdminPromo(adminToken, code, payload);
    showStatus(`Promo ${code} updated.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to update promo', error);
    showStatus(error.message || 'Failed to update promo.', 'error');
  }
}

async function handleDeletePromo(code) {
  if (!confirm(`Delete promo ${code}? This cannot be undone.`)) {
    return;
  }
  try {
    await deleteAdminPromo(adminToken, code);
    showStatus(`Promo ${code} deleted.`);
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Failed to delete promo', error);
    showStatus(error.message || 'Failed to delete promo.', 'error');
  }
}

async function handleUpdateOrderStatus(orderNumber, status) {
  if (!adminToken) {
    showStatus('Admin token is missing. Please reconnect.', 'error');
    throw new Error('Admin token is missing');
  }

  try {
    const result = await updateAdminOrderStatus(adminToken, orderNumber, status);
    const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    showStatus(`✓ Order ${orderNumber} status updated to ${displayStatus}`, 'info');

    // Update the order in local data without full reload
    const orderIndex = lastLoadedData.orders.findIndex(o => o.orderNumber === orderNumber);
    if (orderIndex !== -1) {
      lastLoadedData.orders[orderIndex].status = status;
    }

    console.log('[admin] Order status updated successfully:', result);
  } catch (error) {
    console.error('[admin] Failed to update order status', error);
    const errorMsg = error.message || 'Failed to update order status.';
    showStatus(`✗ ${errorMsg}`, 'error');
    throw error; // Re-throw to handle in button click handler
  }
}

function setupTabs() {
  if (!tabButtons.length) return;

  tabButtons.forEach((button, index) => {
    const isActive = button.dataset.adminTab === activeTab;
    button.setAttribute('tabindex', isActive ? '0' : '-1');
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.adminTab);
    });
    button.addEventListener('keydown', (event) => handleTabKey(event, index));
  });
}

function handleTabKey(event, currentIndex) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) {
    return;
  }

  event.preventDefault();
  let newIndex = currentIndex;

  if (event.key === 'ArrowRight') {
    newIndex = (currentIndex + 1) % tabButtons.length;
  } else if (event.key === 'ArrowLeft') {
    newIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
  } else if (event.key === 'Home') {
    newIndex = 0;
  } else if (event.key === 'End') {
    newIndex = tabButtons.length - 1;
  }

  const nextTab = tabButtons[newIndex];
  if (nextTab) {
    setActiveTab(nextTab.dataset.adminTab, { focusButton: true });
  }
}

function setActiveTab(tab, { focusButton = false } = {}) {
  if (!tabButtons.length) return;

  activeTab = tab;

  // Reset order page when switching tabs
  if (tab === 'orders') {
    currentOrderPage = 1;
  }

  tabButtons.forEach((button) => {
    const isActive = button.dataset.adminTab === tab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    button.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tab;
  });

  try {
    sessionStorage.setItem('evoq_admin_tab', tab);
  } catch (error) {
    // ignore storage errors
  }

  if (focusButton) {
    const button = tabButtons.find((btn) => btn.dataset.adminTab === tab);
    if (button) {
      button.focus();
    }
  }
}


function showStatus(message, type = 'info') {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `admin-status ${type}`;
}

function escapeHtml(value) {
  return (value || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}









