import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, computeOriginalPrice, formatPrice } from '../api/client';
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
      <div className="app-shell detail-shell">
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
      <div className="app-shell detail-shell">
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
  const originalPrice = computeOriginalPrice(
    product.price,
    product.discountPercentage,
  );
  const savingsMinor =
    originalPrice !== null ? Math.max(0, originalPrice - product.price) : 0;

  return (
    <div className="app-shell detail-shell">
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

        <div className="detail-info-sticky">
          <h1 className="detail-title">{product.title}</h1>

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

          <p className="detail-description">{product.description}</p>

          <table className="spec-table" aria-label="Product specifications">
            <tbody>
              <tr>
                <th scope="row">SKU</th>
                <td className="is-mono">{product.sku}</td>
              </tr>
              <tr>
                <th scope="row">Brand</th>
                <td>{product.brand || 'Unbranded'}</td>
              </tr>
              <tr>
                <th scope="row">Category</th>
                <td>{product.category.replace(/-/g, ' ')}</td>
              </tr>
              <tr>
                <th scope="row">Stock</th>
                <td className="is-mono">
                  {product.stock > 0
                    ? `${product.stock} units`
                    : 'Out of stock'}
                </td>
              </tr>
              <tr>
                <th scope="row">Rating</th>
                <td className="is-mono">{product.rating.toFixed(2)} / 5</td>
              </tr>
              <tr>
                <th scope="row">Savings</th>
                <td className="is-mono">
                  {savingsMinor > 0
                    ? `${formatPrice(savingsMinor)} (${product.discountPercentage.toFixed(1)}%)`
                    : 'None'}
                </td>
              </tr>
              <tr>
                <th scope="row">Added</th>
                <td className="is-mono">
                  {new Date(product.createdAt).toLocaleDateString('en-US')}
                </td>
              </tr>
            </tbody>
          </table>

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
