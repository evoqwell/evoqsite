import { useCallback, useEffect, useState } from 'react';
import {
  adminLogin,
  adminLogout,
  restoreSession,
  isAuthenticated,
  setSessionCallbacks,
  fetchAdminAnalytics,
  fetchAdminDashboardSummary,
} from '../../../lib/adminApi.js';
import { queryClient } from '../lib/queryClient';
import { dashboardSummaryKey } from './useDashboard';

const REMEMBER_KEY = 'evoq_admin_remember';

/**
 * Warm the Dashboard's queries immediately after login so the page has data
 * ready by the time React mounts it. Fire-and-forget; failures are silently
 * retried by React Query when the hooks actually subscribe.
 *
 * Keys here must match the keys used inside the hooks (see useOrders.ts).
 */
function prefetchDashboardQueries() {
  queryClient.prefetchQuery({
    queryKey: ['analytics', 'week'],
    queryFn: () => fetchAdminAnalytics(null, 'week'),
  });
  queryClient.prefetchQuery({
    queryKey: dashboardSummaryKey({
      range: 'week',
      lowStockThreshold: 5,
      pendingLimit: 5,
    }),
    queryFn: () =>
      fetchAdminDashboardSummary(null, {
        range: 'week',
        lowStockThreshold: 5,
        pendingLimit: 5,
      }),
  });
}

export function useAdminAuth() {
  const [isAuthed, setIsAuthed] = useState(() => {
    const restored = restoreSession();
    return restored && isAuthenticated();
  });

  useEffect(() => {
    setSessionCallbacks({
      onExpired: () => setIsAuthed(false),
    });
  }, []);

  const login = useCallback(async (token: string, remember: boolean) => {
    if (remember) {
      try { localStorage.setItem(REMEMBER_KEY, '1'); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    }
    await adminLogin(token, remember);
    setIsAuthed(isAuthenticated());
    prefetchDashboardQueries();
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    setIsAuthed(false);
  }, []);

  return { isAuthed, login, logout };
}
