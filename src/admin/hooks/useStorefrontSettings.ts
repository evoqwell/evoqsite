import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminSettings,
  updateAdminSettings,
} from '../../../lib/adminApi.js';
import type { StorefrontSettings } from '../types';

const settingsQueryKey = ['storefront-settings'] as const;

type SettingsResponse = {
  settings?: StorefrontSettings;
};

export function useStorefrontSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => fetchAdminSettings(null),
    staleTime: 30_000,
    select: (data: unknown): StorefrontSettings =>
      (data as SettingsResponse | null)?.settings ?? {
        cardPaymentsEnabled: true,
        updatedAt: null,
      },
  });
}

export function useUpdateStorefrontSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardPaymentsEnabled: boolean) =>
      updateAdminSettings(null, { cardPaymentsEnabled }),
    onMutate: async (cardPaymentsEnabled) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey });
      const previous = queryClient.getQueryData(settingsQueryKey);

      queryClient.setQueryData<SettingsResponse>(settingsQueryKey, (current) => ({
        ...current,
        settings: {
          ...current?.settings,
          cardPaymentsEnabled,
        },
      }));

      return { previous };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(settingsQueryKey, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  });
}
