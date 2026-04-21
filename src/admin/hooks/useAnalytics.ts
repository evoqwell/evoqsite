import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAdminAnalytics } from '../../../lib/adminApi.js';

export type AnalyticsRange = 'daily' | 'week' | 'month' | '3months' | 'all';

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: () => fetchAdminAnalytics(null, range),
    staleTime: 60_000,
    // Keep old data visible while a different range refetches — avoids
    // flashing skeletons when the user switches Today / Week / Month.
    placeholderData: keepPreviousData,
  });
}
