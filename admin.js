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
  updateAdminOrderStatus,
  fetchAdminAnalytics,
  adminLogin,
  adminLogout,
  restoreSession,
  isAuthenticated,
  setSessionCallbacks
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

// Analytics elements
const analyticsRangeSelect = document.getElementById('analytics-range');
const analyticsRefreshBtn = document.getElementById('analytics-refresh');
const analyticsLoading = document.getElementById('analytics-loading');
const analyticsContent = document.getElementById('analytics-content');
const analyticsBreakdown = document.getElementById('analytics-breakdown');
const analyticsError = document.getElementById('analytics-error');
const analyticsChartContainer = document.getElementById('analytics-chart-container');
const analyticsChartCanvas = document.getElementById('analytics-chart');

let analyticsChart = null;

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
  // Set up session callbacks for JWT auth
  setSessionCallbacks({
    onWarning: (minutes) => {
      showStatus(`Session expires in ${minutes} minutes. Your session will refresh automatically.`, 'info');
    },
    onExpired: () => {
      showStatus('Session expired. Please log in again.', 'error');
      adminToken = '';
      if (tokenInput) {
        tokenInput.value = '';
        tokenInput.focus();
      }
    }
  });

  if (connectForm) {
    connectForm.addEventListener('submit', handleConnect);
  }

  // Try to restore JWT session first
  if (restoreSession()) {
    loadDashboard();
  } else {
    // Fall back to legacy token check
    const savedToken = sessionStorage.getItem('evoq_admin_token');
    if (savedToken) {
      tokenInput.value = savedToken;
      adminToken = savedToken;
      loadDashboard();
    }
  }

  if (productCreateForm) {
    productCreateForm.addEventListener('submit', handleCreateProduct);
  }

  if (promoCreateForm) {
    promoCreateForm.addEventListener('submit', handleCreatePromo);
  }

  // Add logout button handler
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  initializeAnalytics();

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

  showStatus('Authenticating...', 'info');

  try {
    // Use JWT login
    await adminLogin(token);
    adminToken = token; // Keep for legacy compatibility
    showStatus('Login successful!', 'info');
    await loadDashboard();
  } catch (error) {
    console.error('[admin] Login failed:', error);
    showStatus(error.message || 'Login failed. Please check your access token.', 'error');
  }
}

async function handleLogout() {
  try {
    await adminLogout();
    adminToken = '';
    if (tokenInput) {
      tokenInput.value = '';
    }
    showStatus('Logged out successfully.', 'info');

    // Clear displayed data
    if (productsContainer) productsContainer.textContent = '';
    if (promosContainer) promosContainer.textContent = '';
    if (ordersContainer) ordersContainer.textContent = '';
  } catch (error) {
    console.error('[admin] Logout error:', error);
    showStatus('Logout completed.', 'info');
  }
}

async function loadDashboard() {
  // Check for JWT auth or legacy token
  if (!isAuthenticated() && !adminToken) {
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
    productsContainer.textContent = '';
    const emptyMsg = createElement('p', { className: 'admin-empty', textContent: 'No products found.' });
    productsContainer.appendChild(emptyMsg);
    return;
  }

  productsContainer.textContent = '';

  // Create list container
  const listContainer = createElement('div', { className: 'admin-list-container' });

  products.forEach((product) => {
    const listItem = createElement('div', { className: 'admin-list-item', 'data-sku': product.sku });

    // Create summary section using safe DOM methods
    const summary = createElement('div', { className: 'admin-list-summary' });

    const stockBadgeClass = product.stock > 0 ? 'success' : 'danger';
    const stockText = product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock';

    const summaryContent = createElement('div', { className: 'admin-list-summary-content' });
    const title = createElement('h3', { className: 'admin-list-title', textContent: product.name });
    summaryContent.appendChild(title);

    const meta = createElement('div', { className: 'admin-list-meta' });
    meta.appendChild(createElement('span', { textContent: `SKU: ${product.sku}` }));
    meta.appendChild(createElement('span', { textContent: `$${Number(product.price).toFixed(2)}` }));
    meta.appendChild(createElement('span', { className: `admin-list-badge ${stockBadgeClass}`, textContent: stockText }));
    const statusLabels = { active: 'Active', coming_soon: 'Coming Soon', inactive: 'Inactive' };
    const statusClasses = { active: 'success', coming_soon: 'warning', inactive: '' };
    const productStatus = product.status || 'active';
    meta.appendChild(createElement('span', {
      className: `admin-list-badge ${statusClasses[productStatus] || ''}`.trim(),
      textContent: statusLabels[productStatus] || productStatus
    }));
    summaryContent.appendChild(meta);
    summary.appendChild(summaryContent);

    // Create expand icon (static SVG is safe)
    const expandIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expandIcon.setAttribute('class', 'admin-list-expand-icon');
    expandIcon.setAttribute('fill', 'none');
    expandIcon.setAttribute('stroke', 'currentColor');
    expandIcon.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M9 5l7 7-7 7');
    expandIcon.appendChild(path);
    summary.appendChild(expandIcon);

    // Create details section with form using safe DOM methods
    const details = createElement('div', { className: 'admin-list-details' });
    const form = createElement('form', { className: 'admin-list-details-form' });

    const cardBody = createElement('div', { className: 'admin-card-body' });

    // Name field
    const nameLabel = createElement('label', {}, ['Name']);
    const nameInput = createElement('input', { type: 'text', name: 'name', value: product.name, required: true });
    nameLabel.appendChild(nameInput);
    cardBody.appendChild(nameLabel);

    // Description field
    const descLabel = createElement('label', {}, ['Description']);
    const descTextarea = createElement('textarea', { name: 'description', rows: '3', textContent: product.description || '' });
    descLabel.appendChild(descTextarea);
    cardBody.appendChild(descLabel);

    // Price and Stock grid
    const grid = createElement('div', { className: 'admin-grid' });
    const priceLabel = createElement('label', {}, ['Price (USD)']);
    const priceInput = createElement('input', { type: 'number', name: 'price', min: '0', step: '0.01', value: Number(product.price).toFixed(2), required: true });
    priceLabel.appendChild(priceInput);
    grid.appendChild(priceLabel);

    const stockLabel = createElement('label', {}, ['Stock']);
    const stockInput = createElement('input', { type: 'number', name: 'stock', min: '0', step: '1', value: String(Number(product.stock || 0)) });
    stockLabel.appendChild(stockInput);
    grid.appendChild(stockLabel);
    cardBody.appendChild(grid);

    // Image field
    const imageLabel = createElement('label', {}, ['Image Path']);
    const imageInput = createElement('input', { type: 'text', name: 'image', value: product.image || '' });
    imageLabel.appendChild(imageInput);
    cardBody.appendChild(imageLabel);

    // Categories field
    const catLabel = createElement('label', {}, ['Categories']);
    const catInput = createElement('input', { type: 'text', name: 'categories', value: formatCategoriesForInput(product), placeholder: 'e.g., Skin, Metabolism' });
    catLabel.appendChild(catInput);
    cardBody.appendChild(catLabel);

    // COA field
    const coaLabel = createElement('label', {}, ['COA File Path']);
    const coaInput = createElement('input', { type: 'text', name: 'coa', value: product.coa || '', placeholder: '/COAs/filename.pdf' });
    coaLabel.appendChild(coaInput);
    cardBody.appendChild(coaLabel);

    // Status dropdown
    const statusLabel = createElement('label', {}, ['Status']);
    const statusSelect = createElement('select', { name: 'status' });
    const statusOptions = [
      { value: 'active', text: 'Active' },
      { value: 'coming_soon', text: 'Coming Soon' },
      { value: 'inactive', text: 'Inactive' }
    ];
    const currentStatus = product.status || 'active';
    statusOptions.forEach(opt => {
      const option = createElement('option', { value: opt.value, textContent: opt.text });
      if (opt.value === currentStatus) option.selected = true;
      statusSelect.appendChild(option);
    });
    statusLabel.appendChild(statusSelect);
    cardBody.appendChild(statusLabel);

    form.appendChild(cardBody);

    // Footer with buttons
    const footer = createElement('footer', { className: 'admin-list-actions' });
    const saveBtn = createElement('button', { type: 'submit', className: 'btn-primary', textContent: 'Save' });
    const deleteBtn = createElement('button', { type: 'button', className: 'btn-danger', 'data-action': 'delete', textContent: 'Delete' });
    footer.appendChild(saveBtn);
    footer.appendChild(deleteBtn);
    form.appendChild(footer);

    // Add event listeners
    summary.addEventListener('click', () => {
      listItem.classList.toggle('expanded');
    });

    form.addEventListener('submit', (event) => handleUpdateProduct(event, product.sku));
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
    promosContainer.textContent = '';
    const emptyMsg = createElement('p', { className: 'admin-empty', textContent: 'No promo codes found.' });
    promosContainer.appendChild(emptyMsg);
    return;
  }

  promosContainer.textContent = '';
  promos.forEach((promo) => {
    const form = createElement('form', { className: 'admin-card', 'data-code': promo.code });

    // Header
    const header = createElement('header', { className: 'admin-card-header' });
    const headerTitle = createElement('h3', { textContent: promo.code });
    header.appendChild(headerTitle);
    form.appendChild(header);

    // Card body
    const cardBody = createElement('div', { className: 'admin-card-body' });

    // Description field
    const descLabel = createElement('label', {}, ['Description']);
    const descTextarea = createElement('textarea', { name: 'description', rows: '2', textContent: promo.description || '' });
    descLabel.appendChild(descTextarea);
    cardBody.appendChild(descLabel);

    // Grid for type and value
    const grid = createElement('div', { className: 'admin-grid' });

    // Discount Type
    const typeLabel = createElement('label', {}, ['Discount Type']);
    const typeSelect = createElement('select', { name: 'discountType' });
    const percentOption = createElement('option', { value: 'percentage', textContent: 'Percentage' });
    const fixedOption = createElement('option', { value: 'fixed', textContent: 'Fixed Amount' });
    if (promo.discountType === 'percentage') percentOption.selected = true;
    if (promo.discountType === 'fixed') fixedOption.selected = true;
    typeSelect.appendChild(percentOption);
    typeSelect.appendChild(fixedOption);
    typeLabel.appendChild(typeSelect);
    grid.appendChild(typeLabel);

    // Discount Value
    const valueLabel = createElement('label', {}, ['Discount Value']);
    const valueInput = createElement('input', { type: 'number', name: 'discountValue', min: '0', step: '0.01', value: Number(promo.discountValue).toFixed(2), required: true });
    valueLabel.appendChild(valueInput);
    grid.appendChild(valueLabel);
    cardBody.appendChild(grid);

    // Active checkbox
    const activeLabel = createElement('label', { className: 'admin-inline' });
    const activeCheckbox = createElement('input', { type: 'checkbox', name: 'isActive', checked: promo.isActive });
    activeLabel.appendChild(activeCheckbox);
    activeLabel.appendChild(createTextNode(' Active'));
    cardBody.appendChild(activeLabel);

    form.appendChild(cardBody);

    // Footer
    const footer = createElement('footer', { className: 'admin-card-actions' });
    const saveBtn = createElement('button', { type: 'submit', className: 'btn-primary', textContent: 'Save' });
    const deleteBtn = createElement('button', { type: 'button', className: 'btn-danger', 'data-action': 'delete', textContent: 'Delete' });
    footer.appendChild(saveBtn);
    footer.appendChild(deleteBtn);
    form.appendChild(footer);

    form.addEventListener('submit', (event) => handleUpdatePromo(event, promo.code));
    deleteBtn.addEventListener('click', () => handleDeletePromo(promo.code));
    promosContainer.appendChild(form);
  });
}

function renderOrders(orders) {
  if (!ordersContainer) return;

  if (!orders.length) {
    ordersContainer.textContent = '';
    const emptyMsg = createElement('p', { className: 'admin-empty', textContent: 'No orders yet.' });
    ordersContainer.appendChild(emptyMsg);
    return;
  }

  ordersContainer.textContent = '';

  // Calculate pagination
  const totalOrders = orders.length;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
  const startIndex = (currentOrderPage - 1) * ORDERS_PER_PAGE;
  const endIndex = Math.min(startIndex + ORDERS_PER_PAGE, totalOrders);
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Create list container
  const listContainer = createElement('div', { className: 'admin-list-container' });

  paginatedOrders.forEach((order) => {
    const listItem = createElement('div', { className: 'admin-list-item', 'data-order-number': order.orderNumber });

    // Create summary section using safe DOM methods
    const summary = createElement('div', { className: 'admin-list-summary' });

    const statusBadgeClass = {
      pending_payment: 'warning',
      paid: 'info',
      fulfilled: 'success',
      cancelled: 'danger'
    }[order.status] || '';

    const statusDisplay = order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const summaryContent = createElement('div', { className: 'admin-list-summary-content' });
    const title = createElement('h3', { className: 'admin-list-title', textContent: `Order #${order.orderNumber}` });
    summaryContent.appendChild(title);

    const meta = createElement('div', { className: 'admin-list-meta' });
    meta.appendChild(createElement('span', { textContent: order.customer.name }));
    meta.appendChild(createElement('span', { textContent: `$${Number(order.totals.total).toFixed(2)}` }));
    meta.appendChild(createElement('span', { textContent: new Date(order.createdAt).toLocaleDateString() }));
    meta.appendChild(createElement('span', { className: `admin-list-badge ${statusBadgeClass}`, textContent: statusDisplay }));
    summaryContent.appendChild(meta);
    summary.appendChild(summaryContent);

    // Create expand icon (static SVG is safe)
    const expandIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expandIcon.setAttribute('class', 'admin-list-expand-icon');
    expandIcon.setAttribute('fill', 'none');
    expandIcon.setAttribute('stroke', 'currentColor');
    expandIcon.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M9 5l7 7-7 7');
    expandIcon.appendChild(path);
    summary.appendChild(expandIcon);

    // Create details section using safe DOM methods
    const details = createElement('div', { className: 'admin-list-details' });
    const detailsForm = createElement('div', { className: 'admin-list-details-form' });
    const cardBody = createElement('div', { className: 'admin-card-body' });

    // Status and Date grid
    const statusGrid = createElement('div', { className: 'admin-grid' });

    // Status select
    const statusDiv = createElement('div');
    const statusLabel = createElement('label', {}, ['Order Status']);
    const select = createElement('select', { 'data-order-status': order.orderNumber });
    ['pending_payment', 'paid', 'fulfilled', 'cancelled'].forEach((status) => {
      const option = createElement('option', {
        value: status,
        textContent: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      });
      if (order.status === status) option.selected = true;
      select.appendChild(option);
    });
    statusLabel.appendChild(select);
    statusDiv.appendChild(statusLabel);

    const updateBtn = createElement('button', {
      type: 'button',
      className: 'btn-primary',
      'data-update-status': order.orderNumber,
      style: 'margin-top: 8px;',
      textContent: 'Update Status'
    });
    statusDiv.appendChild(updateBtn);

    // Print Packing Slip button
    const printBtn = createElement('button', {
      type: 'button',
      className: 'btn-secondary',
      style: 'margin-top: 8px; margin-left: 8px;',
      textContent: 'Print Slip'
    });
    printBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      printPackingSlip(order);
    });
    statusDiv.appendChild(printBtn);
    statusGrid.appendChild(statusDiv);

    // Order date
    const dateDiv = createElement('div');
    const dateStrong = createElement('strong', { textContent: 'Order Date:' });
    dateDiv.appendChild(dateStrong);
    dateDiv.appendChild(createElement('br'));
    dateDiv.appendChild(createTextNode(new Date(order.createdAt).toLocaleString()));
    statusGrid.appendChild(dateDiv);
    cardBody.appendChild(statusGrid);

    // Customer information
    const customerDiv = createElement('div');
    customerDiv.appendChild(createElement('strong', { textContent: 'Customer Information:' }));
    customerDiv.appendChild(createElement('br'));
    customerDiv.appendChild(createTextNode(order.customer.name));
    customerDiv.appendChild(createElement('br'));
    customerDiv.appendChild(createTextNode(order.customer.email));
    customerDiv.appendChild(createElement('br'));
    if (order.customer.phone) {
      customerDiv.appendChild(createTextNode(order.customer.phone));
      customerDiv.appendChild(createElement('br'));
    }
    cardBody.appendChild(customerDiv);

    // Shipping address
    const shippingDiv = createElement('div');
    shippingDiv.appendChild(createElement('strong', { textContent: 'Shipping Address:' }));
    shippingDiv.appendChild(createElement('br'));
    shippingDiv.appendChild(createTextNode(order.customer.address));
    shippingDiv.appendChild(createElement('br'));
    shippingDiv.appendChild(createTextNode(`${order.customer.city}, ${order.customer.state} ${order.customer.zip}`));
    cardBody.appendChild(shippingDiv);

    // Order items
    const itemsDiv = createElement('div');
    itemsDiv.appendChild(createElement('strong', { textContent: 'Order Items:' }));
    const itemsList = createElement('ul', { className: 'admin-order-list' });
    order.items.forEach((item) => {
      const li = createElement('li', { textContent: `${item.name} x ${item.quantity} - $${Number(item.lineTotal).toFixed(2)}` });
      itemsList.appendChild(li);
    });
    itemsDiv.appendChild(itemsList);
    cardBody.appendChild(itemsDiv);

    // Totals grid
    const totalsGrid = createElement('div', { className: 'admin-grid' });

    const totalsDiv = createElement('div');
    totalsDiv.appendChild(createElement('strong', { textContent: 'Subtotal:' }));
    totalsDiv.appendChild(createTextNode(` $${Number(order.totals.subtotal).toFixed(2)}`));
    totalsDiv.appendChild(createElement('br'));
    totalsDiv.appendChild(createElement('strong', { textContent: 'Shipping:' }));
    totalsDiv.appendChild(createTextNode(` $${Number(order.totals.shipping).toFixed(2)}`));
    totalsDiv.appendChild(createElement('br'));
    if (order.totals.discount) {
      totalsDiv.appendChild(createElement('strong', { textContent: 'Discount:' }));
      totalsDiv.appendChild(createTextNode(` -$${Number(order.totals.discount).toFixed(2)}`));
      totalsDiv.appendChild(createElement('br'));
    }
    totalsDiv.appendChild(createElement('strong', { textContent: 'Total:' }));
    totalsDiv.appendChild(createTextNode(` $${Number(order.totals.total).toFixed(2)}`));
    totalsGrid.appendChild(totalsDiv);

    const promoDiv = createElement('div');
    if (order.promoCode) {
      promoDiv.appendChild(createElement('strong', { textContent: 'Promo Code:' }));
      promoDiv.appendChild(createTextNode(` ${order.promoCode}`));
      promoDiv.appendChild(createElement('br'));
    }
    if (order.venmoNote) {
      promoDiv.appendChild(createElement('strong', { textContent: 'Venmo Note:' }));
      promoDiv.appendChild(createTextNode(` ${order.venmoNote}`));
    }
    totalsGrid.appendChild(promoDiv);
    cardBody.appendChild(totalsGrid);

    detailsForm.appendChild(cardBody);
    details.appendChild(detailsForm);

    // Add event listeners
    summary.addEventListener('click', () => {
      listItem.classList.toggle('expanded');
    });

    const orderSelect = details.querySelector(`[data-order-status="${order.orderNumber}"]`);
    const orderUpdateBtn = details.querySelector(`[data-update-status="${order.orderNumber}"]`);

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
    status: formData.get('status') || 'active'
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
    status: formData.get('status') || 'active'
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
  } catch (error) {
    console.error('[admin] Failed to update order status', error);
    const errorMsg = error.message || 'Failed to update order status.';
    showStatus(`✗ ${errorMsg}`, 'error');
    throw error; // Re-throw to handle in button click handler
  }
}

/**
 * Generate and print a packing slip for an order
 */
function printPackingSlip(order) {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.lineTotal).toFixed(2)}</td>
    </tr>
  `).join('');

  const packingSlipHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Packing Slip - ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
      margin-bottom: 24px;
    }
    .brand { font-size: 24px; font-weight: 700; letter-spacing: 2px; }
    .brand-url { font-size: 12px; color: #666; margin-top: 4px; }
    .slip-title { font-size: 18px; color: #666; text-align: right; }
    .order-info {
      background: #f8f8f8;
      padding: 16px;
      margin-bottom: 24px;
    }
    .order-number { font-size: 16px; font-weight: 600; }
    .order-date { color: #666; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .address { font-size: 15px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th {
      text-align: left;
      padding: 8px 0;
      border-bottom: 2px solid #333;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #666;
    }
    .items-table th:last-child { text-align: right; }
    .total-row {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #333;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }
    .thank-you {
      text-align: center;
      padding: 24px 0;
      margin-top: 24px;
      border-top: 1px solid #eee;
      font-size: 15px;
      color: #666;
    }
    .disclaimer {
      margin-top: 24px;
      padding: 16px;
      background: #f8f8f8;
      font-size: 10px;
      color: #888;
      line-height: 1.6;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">EVOQ WELLNESS</div>
      <div class="brand-url">evoqwell.shop</div>
    </div>
    <div class="slip-title">Packing Slip</div>
  </div>

  <div class="order-info">
    <div class="order-number">Order ${order.orderNumber}</div>
    <div class="order-date">${orderDate}</div>
  </div>

  <div class="section">
    <div class="section-title">Ship To</div>
    <div class="address">
      ${order.customer.name}<br>
      ${order.customer.address}<br>
      ${order.customer.city}, ${order.customer.state} ${order.customer.zip}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="total-row">
      <span>Order Total</span>
      <span>$${Number(order.totals.total).toFixed(2)}</span>
    </div>
  </div>

  <div class="thank-you">
    Thank you for your order!
  </div>

  <div class="disclaimer">
    EVOQ products are supplied exclusively for legitimate research purposes and are not intended for human consumption, veterinary use, or medical applications. By purchasing, you acknowledge these conditions and assume responsibility for proper handling and regulatory compliance.
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=650,height=800');
  if (printWindow) {
    printWindow.document.write(packingSlipHtml);
    printWindow.document.close();
  } else {
    showStatus('Unable to open print window. Please allow popups.', 'error');
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

  // Load analytics when switching to analytics tab
  if (tab === 'analytics' && adminToken) {
    loadAnalytics();
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

// Safe DOM creation helpers to prevent XSS
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'htmlContent') {
      // Only use for trusted static HTML (no user data)
      element.innerHTML = value;
    } else if (key.startsWith('data-')) {
      element.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else if (key === 'checked' || key === 'disabled' || key === 'hidden' || key === 'required') {
      if (value) element[key] = true;
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

function createTextNode(text) {
  return document.createTextNode(text || '');
}

function setTextContent(element, text) {
  element.textContent = text || '';
}

// Analytics functions
async function loadAnalytics() {
  if (!adminToken) {
    showAnalyticsError('Connect with admin token to view analytics.');
    return;
  }

  const range = analyticsRangeSelect?.value || 'daily';

  showAnalyticsLoading(true);
  hideAnalyticsError();

  try {
    const data = await fetchAdminAnalytics(adminToken, range);
    renderAnalytics(data);
  } catch (error) {
    console.error('[admin] Failed to load analytics:', error);
    showAnalyticsError(error.message || 'Failed to load analytics.');
  } finally {
    showAnalyticsLoading(false);
  }
}

function renderAnalytics(data) {
  if (!analyticsContent) return;

  // Update total stats
  const uniqueVisitors = document.getElementById('stat-unique-visitors');
  const totalViews = document.getElementById('stat-total-views');

  if (uniqueVisitors) {
    uniqueVisitors.textContent = formatNumber(data.uniqueVisitors || 0);
  }
  if (totalViews) {
    totalViews.textContent = formatNumber(data.totalPageViews || 0);
  }

  // Update page breakdown
  const byPage = data.byPage || {};

  const homepage = byPage.homepage || { uniqueVisitors: 0, pageViews: 0 };
  const homepageVisitors = document.getElementById('stat-homepage-visitors');
  const homepageViews = document.getElementById('stat-homepage-views');
  if (homepageVisitors) homepageVisitors.textContent = formatNumber(homepage.uniqueVisitors);
  if (homepageViews) homepageViews.textContent = formatNumber(homepage.pageViews);

  const products = byPage.products || { uniqueVisitors: 0, pageViews: 0 };
  const productsVisitors = document.getElementById('stat-products-visitors');
  const productsViews = document.getElementById('stat-products-views');
  if (productsVisitors) productsVisitors.textContent = formatNumber(products.uniqueVisitors);
  if (productsViews) productsViews.textContent = formatNumber(products.pageViews);

  // Render chart
  renderAnalyticsChart(data.timeSeries || []);

  // Show content
  analyticsContent.style.display = 'grid';
  if (analyticsChartContainer) analyticsChartContainer.style.display = 'block';
  if (analyticsBreakdown) analyticsBreakdown.style.display = 'block';
}

function convertUtcHourToLocal(label) {
  // Parse hour labels like "1pm", "12am" from UTC to local time
  const match = label.match(/^(\d{1,2})(am|pm)$/i);
  if (!match) return label;

  let hour = parseInt(match[1], 10);
  const isPm = match[2].toLowerCase() === 'pm';

  // Convert to 24-hour format
  if (isPm && hour !== 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;

  // Create a UTC date with this hour and convert to local
  const utcDate = new Date();
  utcDate.setUTCHours(hour, 0, 0, 0);

  // Get the local hour
  const localHour = utcDate.getHours();

  // Convert back to 12-hour format
  const localIsPm = localHour >= 12;
  const localHour12 = localHour === 0 ? 12 : localHour > 12 ? localHour - 12 : localHour;

  return `${localHour12}${localIsPm ? 'pm' : 'am'}`;
}

function renderAnalyticsChart(timeSeries) {
  if (!analyticsChartCanvas || typeof Chart === 'undefined') return;

  // Destroy existing chart
  if (analyticsChart) {
    analyticsChart.destroy();
    analyticsChart = null;
  }

  const homepage = timeSeries.homepage || [];
  const products = timeSeries.products || [];

  // Get all unique labels and convert to local time
  const allLabels = new Set();
  homepage.forEach(item => allLabels.add(item.label));
  products.forEach(item => allLabels.add(item.label));

  // Sort labels by converting back to sortable format
  const sortedLabels = Array.from(allLabels).sort((a, b) => {
    return getLabelSortKey(a) - getLabelSortKey(b);
  });

  const labels = sortedLabels.map(convertUtcHourToLocal);

  // Create data arrays aligned to labels
  const homepageMap = new Map(homepage.map(item => [item.label, item]));
  const productsMap = new Map(products.map(item => [item.label, item]));

  const homepageVisitors = sortedLabels.map(label => homepageMap.get(label)?.uniqueVisitors || 0);
  const homepageViews = sortedLabels.map(label => homepageMap.get(label)?.pageViews || 0);
  const productsVisitors = sortedLabels.map(label => productsMap.get(label)?.uniqueVisitors || 0);
  const productsViews = sortedLabels.map(label => productsMap.get(label)?.pageViews || 0);

  const ctx = analyticsChartCanvas.getContext('2d');

  analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Homepage Visitors',
          data: homepageVisitors,
          borderColor: '#1c6b34',
          backgroundColor: 'rgba(28, 107, 52, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          hidden: false,
          metricType: 'visitors'
        },
        {
          label: 'Products Visitors',
          data: productsVisitors,
          borderColor: '#2d9d4f',
          backgroundColor: 'rgba(45, 157, 79, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 5],
          hidden: false,
          metricType: 'visitors'
        },
        {
          label: 'Homepage Views',
          data: homepageViews,
          borderColor: '#1f3d7a',
          backgroundColor: 'rgba(31, 61, 122, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          hidden: true,
          metricType: 'views'
        },
        {
          label: 'Products Views',
          data: productsViews,
          borderColor: '#4a7fc9',
          backgroundColor: 'rgba(74, 127, 201, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 5],
          hidden: true,
          metricType: 'views'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      events: ['click', 'touchstart'],
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 15,
            generateLabels: function(chart) {
              // Show only two toggle options: Visitors and Views
              const visitorsHidden = chart.data.datasets[0].hidden;
              return [
                {
                  text: 'Unique Visitors',
                  fillStyle: !visitorsHidden ? '#1c6b34' : 'transparent',
                  strokeStyle: '#1c6b34',
                  lineWidth: 2,
                  hidden: false,
                  index: 0,
                  pointStyle: 'circle'
                },
                {
                  text: 'Page Views',
                  fillStyle: visitorsHidden ? '#1f3d7a' : 'transparent',
                  strokeStyle: '#1f3d7a',
                  lineWidth: 2,
                  hidden: false,
                  index: 1,
                  pointStyle: 'circle'
                }
              ];
            }
          },
          onClick: function(e, legendItem, legend) {
            const chart = legend.chart;
            const showVisitors = legendItem.index === 0;

            // Toggle between visitors and views
            chart.data.datasets.forEach((dataset) => {
              if (dataset.metricType === 'visitors') {
                dataset.hidden = !showVisitors;
              } else {
                dataset.hidden = showVisitors;
              }
            });

            chart.update();
          }
        },
        tooltip: {
          backgroundColor: 'rgba(47, 42, 37, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(47, 42, 37, 0.1)'
          },
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function getLabelSortKey(label) {
  // Parse hour labels for sorting
  const match = label.match(/^(\d{1,2})(am|pm)$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const isPm = match[2].toLowerCase() === 'pm';
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return hour;
  }
  // For date labels, try to parse
  return 0;
}

function formatNumber(num) {
  return num.toLocaleString();
}

function showAnalyticsLoading(show) {
  if (analyticsLoading) {
    analyticsLoading.style.display = show ? 'block' : 'none';
  }
  if (analyticsContent && show) {
    analyticsContent.style.display = 'none';
  }
  if (analyticsChartContainer && show) {
    analyticsChartContainer.style.display = 'none';
  }
  if (analyticsBreakdown && show) {
    analyticsBreakdown.style.display = 'none';
  }
}

function showAnalyticsError(message) {
  if (analyticsError) {
    analyticsError.textContent = message;
    analyticsError.style.display = 'block';
  }
}

function hideAnalyticsError() {
  if (analyticsError) {
    analyticsError.style.display = 'none';
  }
}

function initializeAnalytics() {
  if (analyticsRangeSelect) {
    analyticsRangeSelect.addEventListener('change', loadAnalytics);
  }
  if (analyticsRefreshBtn) {
    analyticsRefreshBtn.addEventListener('click', loadAnalytics);
  }
}









