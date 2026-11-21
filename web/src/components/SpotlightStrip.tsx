import { Link } from 'react-router-dom';
import { formatPrice } from '../api/client';
import { useProducts } from '../hooks/useProducts';

interface SpotlightStripProps {
  visible: boolean;
}

export function SpotlightStrip({ visible }: SpotlightStripProps) {
  const spotlightQuery = useProducts(
    { sort: 'rating_desc', inStock: true, page: 1, limit: 3 },
    visible,
  );

  if (!visible) return null;

  const items = spotlightQuery.data?.items ?? [];
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
              <div className="spotlight-meta" style={{ flex: 1 }}>
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
