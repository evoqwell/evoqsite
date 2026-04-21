import { describe, it, expect } from 'vitest';
import { formatCurrencyCents, formatRelativeTime, formatPercentDelta } from './fmt';

describe('formatCurrencyCents', () => {
  it('formats whole dollars', () => {
    expect(formatCurrencyCents(10000)).toBe('$100.00');
  });
  it('formats zero', () => {
    expect(formatCurrencyCents(0)).toBe('$0.00');
  });
  it('formats fractional cents', () => {
    expect(formatCurrencyCents(199)).toBe('$1.99');
  });
  it('handles null/undefined as $0.00', () => {
    expect(formatCurrencyCents(null)).toBe('$0.00');
    expect(formatCurrencyCents(undefined)).toBe('$0.00');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" under 60s', () => {
    const now = new Date();
    expect(formatRelativeTime(now, now)).toBe('just now');
  });
  it('returns minutes under 1h', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-20T11:55:00Z');
    expect(formatRelativeTime(past, base)).toBe('5m ago');
  });
  it('returns hours under 24h', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-20T09:00:00Z');
    expect(formatRelativeTime(past, base)).toBe('3h ago');
  });
  it('returns days when older', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-17T12:00:00Z');
    expect(formatRelativeTime(past, base)).toBe('3d ago');
  });
});

describe('formatPercentDelta', () => {
  it('formats positive delta with arrow', () => {
    expect(formatPercentDelta(120, 100)).toEqual({ text: '↑ 20%', direction: 'up' });
  });
  it('formats negative delta', () => {
    expect(formatPercentDelta(80, 100)).toEqual({ text: '↓ 20%', direction: 'down' });
  });
  it('handles prev=0 as no delta', () => {
    expect(formatPercentDelta(50, 0)).toEqual({ text: '—', direction: 'flat' });
  });
  it('handles zero delta', () => {
    expect(formatPercentDelta(100, 100)).toEqual({ text: '0%', direction: 'flat' });
  });
});
