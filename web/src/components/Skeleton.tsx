interface SkeletonProps {
  count?: number;
}

export function Skeleton({ count = 12 }: SkeletonProps) {
  return (
    <div className="product-grid" aria-label="Loading products">
      {Array.from({ length: count }, (_, idx) => (
        <div key={idx} className="product-card" aria-hidden="true">
          <div className="product-thumb-wrap skeleton-box" />
          <div className="product-body">
            <div className="skeleton-box skeleton-line short" />
            <div className="skeleton-box skeleton-line" />
            <div className="skeleton-box skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
