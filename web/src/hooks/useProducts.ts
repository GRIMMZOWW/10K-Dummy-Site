import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchCategories,
  fetchProductBySlug,
  fetchProducts,
  type ProductFilters,
} from '../api/client';

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => fetchProducts(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useProductDetail(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: ({ signal }) => fetchProductBySlug(slug, signal),
    enabled: slug.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
