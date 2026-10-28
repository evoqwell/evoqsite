import { describe, it, expect } from 'vitest';
import { getOrderPromoCodes } from './promoCodes.js';

describe('getOrderPromoCodes', () => {
  it('returns every code on a stacked-promo order', () => {
    const order = { promoCode: 'SAVE10', promoCodes: ['SAVE10', 'FRIEND5'] };

    expect(getOrderPromoCodes(order)).toEqual(['SAVE10', 'FRIEND5']);
  });

  it('falls back to the single code on orders placed before stacking existed', () => {
    expect(getOrderPromoCodes({ promoCode: 'SAVE10' })).toEqual(['SAVE10']);
    expect(getOrderPromoCodes({ promoCode: 'SAVE10', promoCodes: [] })).toEqual(['SAVE10']);
  });

  it('returns an empty list when no code was used', () => {
    expect(getOrderPromoCodes({ promoCode: null, promoCodes: [] })).toEqual([]);
    expect(getOrderPromoCodes({})).toEqual([]);
  });
});
