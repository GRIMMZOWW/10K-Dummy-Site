import type { ProductCard as ProductCardData } from '../api/client';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  items: ProductCardData[];
  isDimmed: boolean;
}

export function ProductGrid({ items, isDimmed }: ProductGridProps) {
  return (
    <div
      className={`product-grid${isDimmed ? ' is-dimmed' : ''}`}
      aria-busy={isDimmed}
    >
      {items.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
