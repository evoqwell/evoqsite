/**
 * SEO Utility - JSON-LD Structured Data
 * Adds schema.org structured data to improve search engine understanding
 */

const SITE_URL = 'https://evoqwell.shop';
const SITE_NAME = 'EVOQ Wellness';
const SITE_LOGO = `${SITE_URL}/Logo.PNG`;

/**
 * Organization schema for brand identity
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description: 'Premium research-grade peptides for lawful scientific research. Metabolic wellness, evolved.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@evoqwell.shop'
    },
    sameAs: []
  };
}

/**
 * Website schema with search action
 */
export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop.html?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Product schema for individual products
 * @param {Object} product - Product data
 */
export function getProductSchema(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Research-grade ${product.name} peptide for scientific research`,
    image: product.image ? `${SITE_URL}${product.image}` : SITE_LOGO,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop.html#${product.sku}`,
      priceCurrency: 'USD',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME
      }
    },
    category: product.categories?.join(', ') || 'Research Peptides'
  };
}

/**
 * Product list schema for shop page
 * @param {Array} products - Array of products
 */
export function getProductListSchema(products) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Research Peptides Collection',
    description: 'Premium research-grade peptides for lawful scientific research',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: getProductSchema(product)
    }))
  };
}

/**
 * Breadcrumb schema for navigation
 * @param {Array} items - Array of {name, url} objects
 */
export function getBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined
    }))
  };
}

/**
 * FAQ schema for about/contact pages
 * @param {Array} faqs - Array of {question, answer} objects
 */
export function getFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Local Business schema (if applicable)
 */
export function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: SITE_NAME,
    image: SITE_LOGO,
    url: SITE_URL,
    priceRange: '$$',
    description: 'Premium research-grade peptides for lawful scientific research'
  };
}

/**
 * Inject JSON-LD schema into page head
 * @param {Object|Array} schema - Schema object(s) to inject
 */
export function injectSchema(schema) {
  const schemas = Array.isArray(schema) ? schema : [schema];

  schemas.forEach(s => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(s, null, 0);
    document.head.appendChild(script);
  });
}

/**
 * Initialize common schemas for all pages
 */
export function initCommonSchemas() {
  injectSchema([
    getOrganizationSchema(),
    getWebsiteSchema()
  ]);
}

/**
 * Initialize product page schemas
 * @param {Array} products - Products to include in schema
 */
export function initProductSchemas(products) {
  if (products && products.length > 0) {
    injectSchema(getProductListSchema(products));
  }
}

/**
 * Update meta tags dynamically
 * @param {Object} meta - Meta tag values
 */
export function updateMetaTags(meta) {
  if (meta.title) {
    document.title = meta.title;
    updateMetaTag('og:title', meta.title);
    updateMetaTag('twitter:title', meta.title);
  }

  if (meta.description) {
    updateMetaTag('description', meta.description);
    updateMetaTag('og:description', meta.description);
    updateMetaTag('twitter:description', meta.description);
  }

  if (meta.image) {
    updateMetaTag('og:image', meta.image);
    updateMetaTag('twitter:image', meta.image);
  }

  if (meta.url) {
    updateMetaTag('og:url', meta.url);
    updateMetaTag('twitter:url', meta.url);
    updateCanonicalUrl(meta.url);
  }
}

/**
 * Update or create a meta tag
 * @param {string} name - Meta tag name or property
 * @param {string} content - Meta tag content
 */
function updateMetaTag(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`) ||
             document.querySelector(`meta[property="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

/**
 * Update canonical URL
 * @param {string} url - Canonical URL
 */
function updateCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  link.setAttribute('href', url);
}

export default {
  getOrganizationSchema,
  getWebsiteSchema,
  getProductSchema,
  getProductListSchema,
  getBreadcrumbSchema,
  getFAQSchema,
  getLocalBusinessSchema,
  injectSchema,
  initCommonSchemas,
  initProductSchemas,
  updateMetaTags
};
