import { Link } from 'react-router-dom';
import { formatPrice, handleImageError, type ProductCard } from '../api/client';
import { useProducts } from '../hooks/useProducts';

interface SpotlightStripProps {
  visible: boolean;
}

function pickDiverseSpotlight(candidates: ProductCard[], count: number): ProductCard[] {
  const picked: ProductCard[] = [];
  const seenBaseSkus = new Set<string>();
  const seenCategories = new Set<string>();

  for (const item of candidates) {
    const baseSku = item.sku.split('-').slice(0, 2).join('-');
    if (seenBaseSkus.has(baseSku) || seenCategories.has(item.category)) continue;
    seenBaseSkus.add(baseSku);
    seenCategories.add(item.category);
    picked.push(item);
    if (picked.length === count) return picked;
  }

  for (const item of candidates) {
    const baseSku = item.sku.split('-').slice(0, 2).join('-');
    if (seenBaseSkus.has(baseSku)) continue;
    seenBaseSkus.add(baseSku);
    picked.push(item);
    if (picked.length === count) return picked;
  }

  return picked;
}

export function SpotlightStrip({ visible }: SpotlightStripProps) {
  const spotlightQuery = useProducts(
    { sort: 'rating_desc', inStock: true, page: 1, limit: 24 },
    visible,
  );

  if (!visible) return null;

  const items = pickDiverseSpotlight(spotlightQuery.data?.items ?? [], 3);
  if (spotlightQuery.isError || (!spotlightQuery.isPending && items.length === 0)) {
    return null;
  }

  return (
    <section className="spotlight" aria-label="Curated spotlight">
      <div className="spotlight-header">
        <h2 className="spotlight-title">Curated Spotlight</h2>
        <span className="spotlight-sub">Top-rated in-stock picks</span>
      </div>

      {spotlightQuery.isPending ? (
        <div className="spotlight-grid" aria-hidden="true">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="spotlight-item">
              <div className="spotlight-thumb skeleton-box" />
              <div className="spotlight-meta">
                <div className="skeleton-box skeleton-line short" />
                <div className="skeleton-box skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="spotlight-grid">
          {items.map((item) => (
            <Link
              key={item._id}
              to={`/products/${item.slug}`}
              className="spotlight-item"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                loading="lazy"
                className="spotlight-thumb"
                onError={handleImageError}
              />
              <div className="spotlight-meta">
                <span className="spotlight-cat">
                  {item.category.replace(/-/g, ' ')}
                </span>
                <span className="spotlight-name">{item.title}</span>
                <div className="spotlight-stats">
                  <span>{formatPrice(item.price)}</span>
                  <span>{item.rating.toFixed(1)} / 5</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
