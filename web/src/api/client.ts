import type { SyntheticEvent } from 'react';

export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';

export const FALLBACK_IMAGE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" fill="none">' +
      '<rect width="160" height="120" fill="#eeece5"/>' +
      '<rect x="52" y="34" width="56" height="52" rx="4" stroke="#c2beb2" stroke-width="2"/>' +
      '<path d="M62 74l14-16 12 13 8-9 12 12" stroke="#c2beb2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="72" cy="48" r="4" fill="#c2beb2"/>' +
    '</svg>',
  );

export function handleImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  if (img.src !== FALLBACK_IMAGE_SRC) {
    img.src = FALLBACK_IMAGE_SRC;
  }
}

export interface ProductCard {
  _id: string;
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  category: string;
  price: number;
  discountPercentage: number;
  stock: number;
  rating: number;
  thumbnail: string;
  createdAt: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
  tags: string[];
  images: string[];
}

export interface ProductListResponse {
  items: ProductCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: ProductSort;
  page: number;
  limit?: number;
}

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatPrice(minorUnits: number): string {
  return priceFormatter.format(minorUnits / 100);
}

export function computeOriginalPrice(
  minorUnits: number,
  discountPercentage: number,
): number | null {
  if (discountPercentage <= 0 || discountPercentage >= 100) return null;
  return Math.round(minorUnits / (1 - discountPercentage / 100));
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Ignore non-JSON error body.
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export function fetchProducts(
  filters: ProductFilters,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort && filters.sort !== 'relevance') params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return requestJson<ProductListResponse>(`/api/products?${params.toString()}`, signal);
}

export function fetchProductBySlug(slug: string, signal?: AbortSignal): Promise<ProductDetail> {
  return requestJson<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`, signal);
}

export function fetchCategories(signal?: AbortSignal): Promise<CategoryCount[]> {
  return requestJson<CategoryCount[]>('/api/categories', signal);
}
