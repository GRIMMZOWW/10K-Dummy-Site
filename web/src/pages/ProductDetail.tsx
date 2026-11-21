import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, computeOriginalPrice, formatPrice } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { QuickViewDrawer } from '../components/QuickViewDrawer';
import { useProductDetail, useProducts } from '../hooks/useProducts';

export function ProductDetail() {
  const { slug = '' } = useParams();
  const detailQuery = useProductDetail(slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  const product = detailQuery.data;

  const relatedQuery = useProducts(
    {
      category: product?.category,
      sort: 'rating_desc',
      page: 1,
      limit: 5,
    },
    Boolean(product?.category),
  );

  useEffect(() => {
    setSelectedImage(0);
    setQuickViewSlug(null);
  }, [slug]);

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
  const filledStars = Math.round(product.rating);

  const relatedItems = (relatedQuery.data?.items ?? [])
    .filter((item) => item.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="app-shell detail-shell">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="detail-back">
          Back to catalog
        </Link>
        <Link
          to={`/?category=${encodeURIComponent(product.category)}`}
          className="detail-back"
        >
          {product.category.replace(/-/g, ' ')}
        </Link>
      </nav>

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

          <div
            className="detail-rating-bar"
            aria-label={`Rated ${product.rating.toFixed(2)} out of 5`}
          >
            <span className="detail-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={star <= filledStars ? '' : 'is-empty'}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </span>
            <span className="detail-rating-num">
              {product.rating.toFixed(2)} / 5
            </span>
          </div>

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

          <div className="trust-row" aria-label="Catalog assurances">
            <span className="trust-item">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
                <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
              </svg>
              <span>Tracked dispatch</span>
            </span>
            <span className="trust-item">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
              <span>Manufacturer warranty</span>
            </span>
            <span className="trust-item">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>30-day returns</span>
            </span>
          </div>

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

      {relatedItems.length > 0 && (
        <section className="related-section" aria-label="More in this category">
          <h2 className="related-heading">
            More in {product.category.replace(/-/g, ' ')}
          </h2>
          <div className="related-grid">
            {relatedItems.map((item) => (
              <ProductCard
                key={item._id}
                product={item}
                onQuickView={setQuickViewSlug}
              />
            ))}
          </div>
        </section>
      )}

      <QuickViewDrawer
        slug={quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </div>
  );
}
