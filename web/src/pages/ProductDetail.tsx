import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, formatPrice } from '../api/client';
import { useProductDetail } from '../hooks/useProducts';

export function ProductDetail() {
  const { slug = '' } = useParams();
  const detailQuery = useProductDetail(slug);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    setSelectedImage(0);
  }, [slug]);

  const product = detailQuery.data;

  if (detailQuery.isPending) {
    return (
      <div className="app-shell">
        <Link to="/" className="detail-back">
          Back to catalog
        </Link>
        <div className="state-panel">
          <p className="state-copy">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !product) {
    const isNotFound =
      detailQuery.error instanceof ApiError && detailQuery.error.status === 404;

    return (
      <div className="app-shell">
        <Link to="/" className="detail-back">
          Back to catalog
        </Link>
        <div className={`state-panel${isNotFound ? '' : ' is-error'}`} role="alert">
          <h1 className="state-title">
            {isNotFound ? 'Product not found' : 'Could not load product'}
          </h1>
          <p className="state-copy">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'The requested product is unavailable.'}
          </p>
          {!isNotFound && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void detailQuery.refetch()}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const gallery = product.images.length > 0 ? product.images : [product.thumbnail];
  const activeUrl = gallery[selectedImage] ?? product.thumbnail;
  const inStock = product.stock > 0;

  return (
    <div className="app-shell">
      <Link to="/" className="detail-back">
        Back to catalog
      </Link>

      <article className="detail-layout">
        <div className="detail-media">
          <div className="detail-main-image-wrap">
            <img
              src={activeUrl}
              alt={product.title}
              loading="lazy"
              className="detail-main-image"
            />
          </div>
          {gallery.length > 1 && (
            <div className="detail-thumbs" aria-label="Product image gallery">
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
        </div>

        <div className="detail-info">
          <span className="detail-sku">SKU: {product.sku}</span>
          <h1 className="detail-title">{product.title}</h1>

          <div className="detail-price-row">
            <span className="detail-price">{formatPrice(product.price)}</span>
            {product.discountPercentage > 0 && (
              <span className="detail-discount">
                -{product.discountPercentage.toFixed(1)}% list discount
              </span>
            )}
          </div>

          <span className={`stock-tag${inStock ? '' : ' is-out'}`}>
            {inStock ? `${product.stock} units in stock` : 'Out of stock'}
          </span>

          <dl className="detail-specs">
            <div className="spec-item">
              <dt className="spec-label">Category</dt>
              <dd className="spec-value">{product.category.replace(/-/g, ' ')}</dd>
            </div>
            <div className="spec-item">
              <dt className="spec-label">Brand</dt>
              <dd className="spec-value">{product.brand || 'Unbranded'}</dd>
            </div>
            <div className="spec-item">
              <dt className="spec-label">Rating</dt>
              <dd className="spec-value">{product.rating.toFixed(2)} / 5</dd>
            </div>
            <div className="spec-item">
              <dt className="spec-label">Added</dt>
              <dd className="spec-value">
                {new Date(product.createdAt).toLocaleDateString('en-US')}
              </dd>
            </div>
          </dl>

          <p className="detail-description">{product.description}</p>

          {product.tags.length > 0 && (
            <ul className="tag-list" aria-label="Product tags">
              {product.tags.map((tag) => (
                <li key={tag} className="tag-item">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </div>
  );
}
