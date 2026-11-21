import { Link } from 'react-router-dom';
import {
  computeOriginalPrice,
  formatPrice,
  type ProductCard as ProductCardData,
} from '../api/client';

interface ProductCardProps {
  product: ProductCardData;
  onQuickView: (slug: string) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const stockStatus =
    product.stock === 0
      ? { label: 'Out of stock', cls: 'is-out' }
      : product.stock < 10
        ? { label: 'Low stock', cls: 'is-low' }
        : { label: 'In stock', cls: 'is-in' };

  const showDiscount = product.discountPercentage >= 5;
  const originalPrice = showDiscount
    ? computeOriginalPrice(product.price, product.discountPercentage)
    : null;

  return (
    <article className="product-card">
      <div className="product-media">
        <Link to={`/products/${product.slug}`} className="product-thumb-link">
          <img
            src={product.thumbnail}
            alt={product.title}
            loading="lazy"
            className="product-thumb"
          />
        </Link>

        {showDiscount && (
          <span className="discount-pill">
            -{Math.round(product.discountPercentage)}%
          </span>
        )}

        <span className={`status-badge ${stockStatus.cls}`}>
          <span className="status-dot" aria-hidden="true" />
          <span>{stockStatus.label}</span>
        </span>
      </div>

      <div className="product-body">
        <div className="product-eyebrow-row">
          <span className="product-sku">{product.sku}</span>
          <span className="product-brand">{product.brand || product.category}</span>
        </div>

        <h2 className="product-title">
          <Link to={`/products/${product.slug}`}>{product.title}</Link>
        </h2>

        <div
          className="product-rating-row"
          aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
        >
          <svg
            className="star-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>{product.rating.toFixed(1)}</span>
        </div>

        <div className="product-footer">
          <div className="price-stack">
            <span className="product-price">{formatPrice(product.price)}</span>
            {originalPrice !== null && (
              <span className="product-price-orig">{formatPrice(originalPrice)}</span>
            )}
          </div>

          <button
            type="button"
            className="quick-view-btn"
            onClick={() => onQuickView(product.slug)}
          >
            Quick View
          </button>
        </div>
      </div>
    </article>
  );
}
