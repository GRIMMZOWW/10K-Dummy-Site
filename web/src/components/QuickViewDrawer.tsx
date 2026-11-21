import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeOriginalPrice, formatPrice } from '../api/client';
import { useProductDetail } from '../hooks/useProducts';

interface QuickViewDrawerProps {
  slug: string | null;
  onClose: () => void;
}

export function QuickViewDrawer({ slug, onClose }: QuickViewDrawerProps) {
  const detailQuery = useProductDetail(slug ?? '');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    setSelectedImage(0);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slug, onClose]);

  if (!slug) return null;

  const product = detailQuery.data;
  const gallery =
    product && product.images.length > 0
      ? product.images
      : product
        ? [product.thumbnail]
        : [];
  const activeUrl = gallery[selectedImage] ?? product?.thumbnail;
  const originalPrice = product
    ? computeOriginalPrice(product.price, product.discountPercentage)
    : null;

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <div className="drawer-header">
          <span className="product-sku">
            {product ? product.sku : 'Loading item'}
          </span>
          <button
            type="button"
            className="drawer-close"
            aria-label="Close quick view"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {detailQuery.isPending ? (
          <div className="state-panel">
            <p className="state-copy">Loading product details...</p>
          </div>
        ) : detailQuery.isError || !product ? (
          <div className="state-panel is-error" role="alert">
            <p className="state-copy">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Could not load product details.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void detailQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="detail-main-image-wrap">
              <img
                src={activeUrl}
                alt={product.title}
                loading="lazy"
                className="detail-main-image"
              />
            </div>

            {gallery.length > 1 && (
              <div className="detail-thumbs" aria-label="Product gallery">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    className={`detail-thumb-btn${idx === selectedImage ? ' is-active' : ''}`}
                    aria-label={`View image ${idx + 1}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={imgUrl} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <h2 id="quick-view-title" className="detail-title">
              {product.title}
            </h2>

            <div className="detail-price-row">
              <span className="detail-price">{formatPrice(product.price)}</span>
              {originalPrice !== null && product.discountPercentage >= 5 && (
                <span className="product-price-orig">
                  {formatPrice(originalPrice)}
                </span>
              )}
              {product.discountPercentage > 0 && (
                <span className="detail-discount">
                  -{product.discountPercentage.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="product-eyebrow-row">
              <span>{product.category.replace(/-/g, ' ')}</span>
              <span>
                {product.stock > 0
                  ? `${product.stock} units in stock`
                  : 'Out of stock'}
              </span>
            </div>

            <p className="detail-description">{product.description}</p>

            <div className="drawer-actions">
              <Link
                to={`/products/${product.slug}`}
                className="btn-primary"
                onClick={onClose}
              >
                View Full Page
              </Link>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
