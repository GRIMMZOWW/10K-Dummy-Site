import type { FilterQuery, SortOrder } from 'mongoose';
import { ProductModel, type Product } from '../../models/product.model';
import type { ProductListQuery } from './product.schema';

const CARD_PROJECTION = {
  _id: 1,
  sku: 1,
  slug: 1,
  title: 1,
  brand: 1,
  category: 1,
  price: 1,
  discountPercentage: 1,
  stock: 1,
  rating: 1,
  thumbnail: 1,
  createdAt: 1,
} as const;

export type ProductCard = Pick<
  Product,
  | 'sku'
  | 'slug'
  | 'title'
  | 'brand'
  | 'category'
  | 'price'
  | 'discountPercentage'
  | 'stock'
  | 'rating'
  | 'thumbnail'
  | 'createdAt'
> & { _id: unknown };

export interface CategorySummary {
  name: string;
  count: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildListQueryParts(query: ProductListQuery): {
  filter: FilterQuery<Product>;
  sort: Record<string, SortOrder | { $meta: 'textScore' }>;
  isTextSearch: boolean;
} {
  const filter: FilterQuery<Product> = {};
  let isTextSearch = false;
  let isPrefixSearch = false;

  if (query.category) {
    filter.category = query.category;
  }

  if (query.inStock) {
    filter.stock = { $gt: 0 };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }

  if (query.q) {
    if (query.q.length <= 2) {
      isPrefixSearch = true;
      filter.titleLower = { $regex: `^${escapeRegex(query.q.toLowerCase())}` };
    } else {
      isTextSearch = true;
      filter.$text = { $search: query.q };
    }
  }

  let sort: Record<string, SortOrder | { $meta: 'textScore' }>;
  switch (query.sort) {
    case 'price_asc':
      sort = { price: 1 };
      break;
    case 'price_desc':
      sort = { price: -1 };
      break;
    case 'rating_desc':
      sort = { rating: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'relevance':
    default:
      if (isTextSearch) {
        sort = { score: { $meta: 'textScore' } };
      } else if (isPrefixSearch) {
        sort = { titleLower: 1 };
      } else if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        sort = { price: 1 };
      } else {
        sort = { createdAt: -1 };
      }
      break;
  }

  return { filter, sort, isTextSearch };
}

export const productRepository = {
  async findList(query: ProductListQuery): Promise<{ items: ProductCard[]; total: number }> {
    const { filter, sort, isTextSearch } = buildListQueryParts(query);
    const skip = (query.page - 1) * query.limit;

    const projection = isTextSearch
      ? { ...CARD_PROJECTION, score: { $meta: 'textScore' } }
      : CARD_PROJECTION;

    const [rawItems, total] = await Promise.all([
      ProductModel.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .lean<Array<ProductCard & { score?: number }>>(),
      ProductModel.countDocuments(filter),
    ]);

    const items: ProductCard[] = isTextSearch
      ? rawItems.map(({ score: _score, ...card }) => card)
      : rawItems;

    return { items, total };
  },

  async findBySlug(slug: string): Promise<(Product & { _id: unknown }) | null> {
    return ProductModel.findOne({ slug }).lean<Product & { _id: unknown }>();
  },

  async getCategories(): Promise<CategorySummary[]> {
    return ProductModel.aggregate<CategorySummary>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { name: 1 } },
    ]);
  },
};
