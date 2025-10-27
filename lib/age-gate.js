/**
 * Age Gate Implementation - Cookie-based verification with localStorage fallback
 * Shows modal once per 24 hours using cookies + session storage for reliability
 */

const AGE_COOKIE_NAME = 'evoq_age_verified';
const COOKIE_DURATION_HOURS = 24;
const SESSION_KEY = 'evoq_session_verified'; // Session-only flag

/**
 * Set a cookie
 */
function setCookie(name, value, hours) {
  const date = new Date();
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
}

/**
 * Get a cookie value
 */
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Check if user has verified age
 */
export function isAgeVerified() {
  // First check sessionStorage (most reliable for same session)
  try {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      return true;
    }
  } catch (e) {
    // SessionStorage might be blocked
  }

  // Then check cookie
  const cookieValue = getCookie(AGE_COOKIE_NAME);
  if (cookieValue === 'true') {
    // Restore sessionStorage
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch (e) {}
    return true;
  }

  // Fallback to localStorage if cookie not available
  try {
    const lsData = localStorage.getItem('evoq_age_verified_backup');
    if (lsData) {
      const data = JSON.parse(lsData);
      const now = Date.now();
      const hoursSince = (now - data.timestamp) / (1000 * 60 * 60);

      if (hoursSince < COOKIE_DURATION_HOURS && data.verified) {
        // Restore cookie and session
        setCookie(AGE_COOKIE_NAME, 'true', COOKIE_DURATION_HOURS);
        try {
          sessionStorage.setItem(SESSION_KEY, 'true');
        } catch (e) {}
        return true;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  return false;
}

/**
 * Set age as verified
 */
export function setAgeVerified() {
  // Set cookie (24 hour expiration)
  setCookie(AGE_COOKIE_NAME, 'true', COOKIE_DURATION_HOURS);

  // Set sessionStorage (most reliable for same session)
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch (e) {
    // SessionStorage might be blocked
  }

  // Also set in localStorage as fallback
  try {
    localStorage.setItem('evoq_age_verified_backup', JSON.stringify({
      timestamp: Date.now(),
      verified: true
    }));
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Show age gate modal
 */
export function showAgeGate() {
  // Remove any existing modal
  const existingOverlay = document.getElementById('age-gate-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Blur main content
  const mainContent = document.querySelector('main');
  const footer = document.querySelector('footer');

  [mainContent, footer].forEach(el => {
    if (el) {
      el.style.filter = 'blur(10px)';
      el.style.pointerEvents = 'none';
    }
  });

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'age-gate-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.98);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #F5F1E9;
    padding: 3rem;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div style="font-family: Arial, sans-serif; font-size: 2.5em; font-weight: 700; color: #333; letter-spacing: 2px; display: inline-flex; align-items: center; gap: 0.15rem;">
        EVOQ<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 34" fill="currentColor" style="width: 0.42em; height: 0.85em; color: #333; margin: 0 0.05em;">
          <path d="M10 1L2 16h6L6.5 33l9-20H9L11 1z"/>
        </svg>
      </div>
      <div style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1em; color: #8A7D6E; margin-top: 0.5rem;">
        Metabolic Wellness, Evolved
      </div>
    </div>

    <h2 style="font-family: Arial, sans-serif; color: #333; margin-bottom: 1.5rem; font-size: 1.5rem;">
      Age Verification Required
    </h2>

    <p style="font-family: 'Cormorant Garamond', serif; color: #444; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">
      Our products are research-grade peptides intended for lawful scientific research purposes only.
      You must be 21 years of age or older to access this website.
    </p>

    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
      <button id="age-verify-yes" style="
        background: #8A7D6E;
        color: #F5F1E9;
        border: none;
        padding: 1rem 2.5rem;
        font-family: Arial, sans-serif;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 140px;
      ">
        I am 21 or older
      </button>

      <button id="age-verify-no" style="
        background: transparent;
        color: #333;
        border: 2px solid #333;
        padding: 1rem 2.5rem;
        font-family: Arial, sans-serif;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 140px;
      ">
        I am under 21
      </button>
    </div>

    <p style="font-family: 'Cormorant Garamond', serif; color: #666; font-size: 0.9rem; margin-top: 2rem; font-style: italic;">
      By entering, you acknowledge that all products are for research purposes only.
    </p>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Prevent scrolling
  document.body.style.overflow = 'hidden';

  // Add hover effects
  const yesBtn = modal.querySelector('#age-verify-yes');
  const noBtn = modal.querySelector('#age-verify-no');

  yesBtn.addEventListener('mouseenter', () => {
    yesBtn.style.background = '#6B5E50';
    yesBtn.style.transform = 'translateY(-2px)';
  });
  yesBtn.addEventListener('mouseleave', () => {
    yesBtn.style.background = '#8A7D6E';
    yesBtn.style.transform = 'translateY(0)';
  });

  noBtn.addEventListener('mouseenter', () => {
    noBtn.style.background = '#333';
    noBtn.style.color = '#F5F1E9';
  });
  noBtn.addEventListener('mouseleave', () => {
    noBtn.style.background = 'transparent';
    noBtn.style.color = '#333';
  });

  // Handle verification
  yesBtn.addEventListener('click', () => {
    setAgeVerified();

    // Restore content
    [mainContent, footer].forEach(el => {
      if (el) {
        el.style.filter = '';
        el.style.pointerEvents = '';
      }
    });

    document.body.style.overflow = '';

    overlay.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  });

  noBtn.addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });

  // Add CSS animations if not already present
  if (!document.getElementById('age-gate-styles')) {
    const style = document.createElement('style');
    style.id = 'age-gate-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Initialize age gate on page load
 */
if (!isAgeVerified()) {
  // Show modal immediately if not verified
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showAgeGate);
  } else {
    showAgeGate();
  }
}
