﻿import {
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
  products.forEach((product) => {
    const form = document.createElement('form');
    form.className = 'admin-card';
    form.dataset.sku = product.sku;
    const categoriesValue = escapeHtml(formatCategoriesForInput(product));
    form.innerHTML = `
      <header class="admin-card-header">
        <h3>${escapeHtml(product.name)}</h3>
        <span class="admin-sku">SKU: ${escapeHtml(product.sku)}</span>
      </header>
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
          COA File Path (e.g., /COAs/ProductName COA.pdf)
          <input type="text" name="coa" value="${escapeHtml(product.coa || '')}" placeholder="/COAs/filename.pdf">
        </label>
        <label class="admin-inline">
          <input type="checkbox" name="isActive" ${product.isActive ? 'checked' : ''}>
          Active
        </label>
      </div>
      <footer class="admin-card-actions">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-danger" data-action="delete">Delete</button>
      </footer>
    `;

    form.addEventListener('submit', (event) => handleUpdateProduct(event, product.sku));
    const deleteBtn = form.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', () => handleDeleteProduct(product.sku));
    productsContainer.appendChild(form);
  });
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

  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'admin-card';

    const itemsList = order.items
      .map(
        (item) =>
          `<li>${escapeHtml(item.name)} x ${item.quantity} - $${Number(item.lineTotal).toFixed(2)}</li>`
      )
      .join('');

    const statusOptions = ['pending_payment', 'paid', 'fulfilled', 'cancelled']
      .map(
        (status) =>
          `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`
      )
      .join('');

    card.innerHTML = `
      <header class="admin-card-header">
        <h3>Order ${order.orderNumber}</h3>
        <time>${new Date(order.createdAt).toLocaleString()}</time>
      </header>
      <div class="admin-card-body">
        <p><strong>Status:</strong>
          <select data-order-status="${order.orderNumber}">
            ${statusOptions}
          </select>
        </p>
        <p><strong>Total:</strong> $${Number(order.totals.total).toFixed(2)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(order.customer.name)} (${escapeHtml(order.customer.email)})</p>
        <p><strong>Shipping:</strong><br>${escapeHtml(order.customer.address)}<br>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zip)}</p>
        <p><strong>Items:</strong></p>
        <ul class="admin-order-list">${itemsList}</ul>
        <p><strong>Promo:</strong> ${order.promoCode || 'N/A'}</p>
        <p><strong>Venmo Note:</strong> ${escapeHtml(order.venmoNote || '')}</p>
      </div>
    `;

    const select = card.querySelector(`[data-order-status="${order.orderNumber}"]`);
    select.addEventListener('change', () =>
      handleUpdateOrderStatus(order.orderNumber, select.value)
    );

    ordersContainer.appendChild(card);
  });
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
  try {
    await updateAdminOrderStatus(adminToken, orderNumber, status);
    showStatus(`Order ${orderNumber} status updated to ${status}.`);
  } catch (error) {
    console.error('[admin] Failed to update order status', error);
    showStatus(error.message || 'Failed to update order status.', 'error');
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









