import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from '../../../lib/adminApi.js';
import type { Product } from '../types';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchAdminProducts(null),
    staleTime: 60_000,
    select: (data: unknown): Product[] =>
      (data as { products?: Product[] } | null)?.products ?? [],
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminProduct(null, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, payload }: { sku: string; payload: Record<string, unknown> }) =>
      updateAdminProduct(null, sku, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sku: string) => deleteAdminProduct(null, sku),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
