import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminPromo,
  deleteAdminPromo,
  fetchAdminPromos,
  updateAdminPromo,
} from '../../../lib/adminApi.js';
import type { Promo } from '../types';

export function usePromos() {
  return useQuery({
    queryKey: ['promos'],
    queryFn: () => fetchAdminPromos(null),
    staleTime: 60_000,
    select: (data: unknown): Promo[] =>
      (data as { promos?: Promo[] } | null)?.promos ?? [],
  });
}

export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      createAdminPromo(null, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }),
  });
}

export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: {
      code: string;
      payload: Record<string, unknown>;
    }) => updateAdminPromo(null, code, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }),
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => deleteAdminPromo(null, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }),
  });
}
