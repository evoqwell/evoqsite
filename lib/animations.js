/**
 * Animation utilities for enhancing page interactions
 */

// Enhanced fade-in animation with intersection observer
export function initFadeInAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in-enhanced');

  if (!fadeElements.length) return;

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, options);

  fadeElements.forEach(element => {
    observer.observe(element);
  });
}

// Staggered animations for lists
export function initStaggeredAnimations() {
  const containers = document.querySelectorAll('[data-stagger]');

  containers.forEach(container => {
    const items = container.querySelectorAll('.stagger-item');
    const delay = parseInt(container.dataset.staggerDelay) || 100;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const items = entry.target.querySelectorAll('.stagger-item');
          items.forEach((item, index) => {
            setTimeout(() => {
              item.classList.add('animate');
            }, index * delay);
          });
          observer.unobserve(entry.target);
        }
      });
    });

    observer.observe(container);
  });
}

// Parallax effect for hero sections
export function initParallax() {
  const parallaxElements = document.querySelectorAll('.hero-parallax-bg');

  if (!parallaxElements.length) return;

  let ticking = false;

  function updateParallax() {
    const scrolled = window.pageYOffset;

    parallaxElements.forEach(element => {
      const speed = element.dataset.parallaxSpeed || 0.5;
      const yPos = -(scrolled * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick);
}

// Ripple effect for buttons
export function initRippleEffect() {
  const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-add-cart');

  buttons.forEach(button => {
    button.classList.add('ripple');

    button.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple-effect');

      this.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

// Counter animation for numbers
export function animateCounter(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16); // 60fps
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      element.textContent = end;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

// Smooth scroll to element
export function smoothScrollTo(element, offset = 100) {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

// Initialize all animations
export function initAllAnimations() {
  // Wait for DOM content to be loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFadeInAnimations();
      initStaggeredAnimations();
      initParallax();
      initRippleEffect();
    });
  } else {
    initFadeInAnimations();
    initStaggeredAnimations();
    initParallax();
    initRippleEffect();
  }
}

// Auto-initialize on import
initAllAnimations();