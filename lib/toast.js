/**
 * Toast Notification System
 * Provides elegant toast notifications for user feedback
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create or find toast container
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type (success, error, info)
   * @param {number} options.duration - Duration in milliseconds (default 3000)
   */
  show({ title, message, type = 'info', duration = 3000 }) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Create icon based on type
    const icon = this.getIcon(type);

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-text">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.removeToast(toast));

    // Add to container
    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    return toast;
  }

  removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(message, title = 'Success') {
    return this.show({ title, message, type: 'success' });
  }

  error(message, title = 'Error') {
    return this.show({ title, message, type: 'error' });
  }

  info(message, title = '') {
    return this.show({ title, message, type: 'info' });
  }
}

// Create and export singleton instance
const toastManager = new ToastManager();

// Export functions for easy use
export const showToast = (options) => toastManager.show(options);
export const showSuccessToast = (message, title) => toastManager.success(message, title);
export const showErrorToast = (message, title) => toastManager.error(message, title);
export const showInfoToast = (message, title) => toastManager.info(message, title);

export default toastManager;