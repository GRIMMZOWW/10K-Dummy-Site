import type { ProductCard as ProductCardData } from '../api/client';
import type { GridDensity } from './Header';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  items: ProductCardData[];
  isDimmed: boolean;
  density: GridDensity;
  onQuickView: (slug: string) => void;
}

export function ProductGrid({
  items,
  isDimmed,
  density,
  onQuickView,
}: ProductGridProps) {
  return (
    <div
      className={`product-grid${density === '3-col' ? ' is-spacious' : ''}${isDimmed ? ' is-dimmed' : ''}`}
      aria-busy={isDimmed}
    >
      {items.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}
