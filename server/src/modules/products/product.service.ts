import { NotFoundError } from '../../middleware/error';
import {
  productRepository,
  type CategorySummary,
  type ProductCard,
} from './product.repository';
import type { ProductListQuery } from './product.schema';

export interface ProductListResult {
  items: ProductCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const productService = {
  async listProducts(query: ProductListQuery): Promise<ProductListResult> {
    const { items, total } = await productRepository.findList(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    };
  },

  async getProductBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError(`Product not found for slug "${slug}"`);
    }
    return product;
  },

  async listCategories(): Promise<CategorySummary[]> {
    return productRepository.getCategories();
  },
};
