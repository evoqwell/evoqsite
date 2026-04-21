import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminAuth } from './useAdminAuth';

vi.mock('../../../lib/adminApi.js', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
  restoreSession: vi.fn(),
  isAuthenticated: vi.fn(),
  setSessionCallbacks: vi.fn(),
}));

import * as adminApi from '../../../lib/adminApi.js';

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts unauthenticated when no session exists', () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(false);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(false);
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthed).toBe(false);
  });

  it('starts authenticated when session restored', () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(true);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthed).toBe(true);
  });

  it('login sets authed and persists token to localStorage when remember=true', async () => {
    vi.mocked(adminApi.adminLogin).mockResolvedValue({ token: 'jwt', expiresAt: Date.now() + 10000 });
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.login('tok', true);
    });
    expect(result.current.isAuthed).toBe(true);
    expect(localStorage.getItem('evoq_admin_remember')).toBe('1');
  });

  it('login does NOT set remember flag when remember=false', async () => {
    vi.mocked(adminApi.adminLogin).mockResolvedValue({ token: 'jwt', expiresAt: Date.now() + 10000 });
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.login('tok', false);
    });
    expect(localStorage.getItem('evoq_admin_remember')).toBeNull();
  });

  it('logout clears authed state', async () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(true);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    vi.mocked(adminApi.adminLogout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthed).toBe(false);
    expect(localStorage.getItem('evoq_admin_remember')).toBeNull();
  });
});
