import { Link } from 'react-router-dom';
import { formatPrice, type ProductCard as ProductCardData } from '../api/client';

interface ProductCardProps {
  product: ProductCardData;
}

export function ProductCard({ product }: ProductCardProps) {
  const inStock = product.stock > 0;

  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-thumb-wrap">
        <img
          src={product.thumbnail}
          alt={product.title}
          loading="lazy"
          className="product-thumb"
        />
      </Link>
      <div className="product-body">
        <span className="product-category">{product.category}</span>
        <h2 className="product-title">
          <Link to={`/products/${product.slug}`}>{product.title}</Link>
        </h2>
        <span className={`stock-tag${inStock ? '' : ' is-out'}`}>
          {inStock ? `${product.stock} in stock` : 'Out of stock'}
        </span>
        <div className="product-meta-row">
          <span className="product-price">{formatPrice(product.price)}</span>
          <span className="product-rating" aria-label={`Rated ${product.rating} out of 5`}>
            {product.rating.toFixed(1)} / 5
          </span>
        </div>
      </div>
    </article>
  );
}
