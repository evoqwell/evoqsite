export const products = [
  {
    sku: 'tirzepatide-10mg',
    name: 'Tirzepatide 10mg',
    description: 'High-purity research peptide for laboratory use only.',
    priceCents: 8500,
    image: '/Tirzepatide.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'tirzepatide-15mg',
    name: 'Tirzepatide 15mg',
    description: 'High-purity research peptide for laboratory use only.',
    priceCents: 11000,
    image: '/Tirzepatide.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'retatrutide-10mg',
    name: 'Retatrutide 10mg',
    description: 'Research-grade peptide for laboratory applications.',
    priceCents: 12000,
    image: '/Retatrutide.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'retatrutide-12mg',
    name: 'Retatrutide 12mg',
    description: 'Research-grade peptide for laboratory applications.',
    priceCents: 14000,
    image: '/Retatrutide.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'sermorelin-2mg',
    name: 'Sermorelin 2mg',
    description: 'Premium research peptide for scientific studies.',
    priceCents: 4000,
    image: '/sermorelin.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'sermorelin-5mg',
    name: 'Sermorelin 5mg',
    description: 'Premium research peptide for scientific studies.',
    priceCents: 8500,
    image: '/sermorelin.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'ghk-cu-50mg',
    name: 'GHK-Cu 50mg',
    description: 'Copper peptide complex for research purposes.',
    priceCents: 3500,
    image: '/GHK-Cu.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'ghk-cu-100mg',
    name: 'GHK-Cu 100mg',
    description: 'Copper peptide complex for research purposes.',
    priceCents: 6000,
    image: '/GHK-Cu.png',
    category: 'peptides',
    stock: 999,
    isActive: true
  },
  {
    sku: 'nad-500mg',
    name: 'NAD+ 500mg',
    description: 'Research-grade nicotinamide adenine dinucleotide.',
    priceCents: 5000,
    image: '/NAD+.png',
    category: 'supplements',
    stock: 999,
    isActive: true
  },
  {
    sku: 'nad-1000mg',
    name: 'NAD+ 1000mg',
    description: 'Research-grade nicotinamide adenine dinucleotide.',
    priceCents: 9000,
    image: '/NAD+.png',
    category: 'supplements',
    stock: 999,
    isActive: true
  },
  {
    sku: 'bac-water-30ml',
    name: 'BAC Water 30ml',
    description: 'Bacteriostatic water for reconstitution.',
    priceCents: 1500,
    image: '/BAC water.png',
    category: 'supplies',
    stock: 999,
    isActive: true
  },
  {
    sku: 'klow-cognitive',
    name: 'Klow Cognitive Enhancement',
    description: 'Nootropic blend for research applications.',
    priceCents: 6500,
    image: '/Klow.png',
    category: 'supplements',
    stock: 999,
    isActive: true
  }
];

export const promoCodes = [
  {
    code: 'MOSS4PREZ',
    discountType: 'percentage',
    discountValue: 20,
    description: '20% off your order',
    isActive: true
  },
  {
    code: '10OFF',
    discountType: 'percentage',
    discountValue: 10,
    description: '10% off your order',
    isActive: true
  },
  {
    code: 'WELCOME',
    discountType: 'fixed',
    discountValue: 15,
    description: '$15 off your order',
    isActive: true
  }
];
