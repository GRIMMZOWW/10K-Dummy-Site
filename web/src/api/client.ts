export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';

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
