interface ActiveFiltersProps {
  page: number;
  limit: number;
  itemCount: number;
  total: number;
  isFetching: boolean;
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  onClearQ: () => void;
  onClearCategory: () => void;
  onClearPrice: () => void;
  onClearInStock: () => void;
  onClearAll: () => void;
}

export function ActiveFilters({
  page,
  limit,
  itemCount,
  total,
  isFetching,
  q,
  category,
  minPrice,
  maxPrice,
  inStock,
  onClearQ,
  onClearCategory,
  onClearPrice,
  onClearInStock,
  onClearAll,
}: ActiveFiltersProps) {
  const start = total === 0 || itemCount === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 || itemCount === 0 ? 0 : start + itemCount - 1;

  const hasPrice = Boolean(minPrice || maxPrice);
  const priceLabel =
    minPrice && maxPrice
      ? `$${minPrice}–$${maxPrice}`
      : minPrice
        ? `$${minPrice}+`
        : `Under $${maxPrice}`;

  const hasAnyChip = Boolean(q || category || hasPrice || inStock);

  const closeIcon = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );

  return (
    <div className="active-bar">
      <div className="telemetry-text" aria-live="polite">
        {total === 0
          ? 'Showing 0 items'
          : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
        {isFetching ? ' (updating)' : ''}
      </div>

      {hasAnyChip && (
        <div className="active-chips" aria-label="Active filters">
          {q && (
            <button type="button" className="filter-chip" onClick={onClearQ}>
              <span>Query: {q}</span>
              {closeIcon}
            </button>
          )}
          {category && (
            <button type="button" className="filter-chip" onClick={onClearCategory}>
              <span>Category: {category.replace(/-/g, ' ')}</span>
              {closeIcon}
            </button>
          )}
          {hasPrice && (
            <button type="button" className="filter-chip" onClick={onClearPrice}>
              <span>Price: {priceLabel}</span>
              {closeIcon}
            </button>
          )}
          {inStock && (
            <button type="button" className="filter-chip" onClick={onClearInStock}>
              <span>In stock only</span>
              {closeIcon}
            </button>
          )}
          <button type="button" className="btn-link" onClick={onClearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
