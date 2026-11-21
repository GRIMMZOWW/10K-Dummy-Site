import type { CategoryCount, ProductSort } from '../api/client';

interface FilterSidebarProps {
  categories: CategoryCount[];
  selectedCategory: string;
  minPriceInput: string;
  maxPriceInput: string;
  priceError: string | null;
  inStock: boolean;
  sort: ProductSort;
  hasActiveFilters: boolean;
  onCategoryChange: (category: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onInStockChange: (checked: boolean) => void;
  onSortChange: (sort: ProductSort) => void;
  onReset: () => void;
}

export function FilterSidebar({
  categories,
  selectedCategory,
  minPriceInput,
  maxPriceInput,
  priceError,
  inStock,
  sort,
  hasActiveFilters,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onInStockChange,
  onSortChange,
  onReset,
}: FilterSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Catalog filters">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Filters</h2>
        {hasActiveFilters && (
          <button type="button" className="btn-link" onClick={onReset}>
            Reset
          </button>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="sort-select" className="filter-label">
          Sort by
        </label>
        <select
          id="sort-select"
          className="select-input"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ProductSort)}
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Highest Rated</option>
        </select>
      </div>

      <div className="filter-group">
        <span className="filter-label">Price (USD)</span>
        <div className="price-row">
          <div className="price-field">
            <label htmlFor="min-price" className="field-hint">
              Min
            </label>
            <input
              id="min-price"
              type="text"
              inputMode="decimal"
              className="text-input"
              placeholder="0.00"
              value={minPriceInput}
              onChange={(e) => onMinPriceChange(e.target.value)}
            />
          </div>
          <div className="price-field">
            <label htmlFor="max-price" className="field-hint">
              Max
            </label>
            <input
              id="max-price"
              type="text"
              inputMode="decimal"
              className="text-input"
              placeholder="50000"
              value={maxPriceInput}
              onChange={(e) => onMaxPriceChange(e.target.value)}
            />
          </div>
        </div>
        {priceError && (
          <p className="field-error" role="alert">
            {priceError}
          </p>
        )}
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => onInStockChange(e.target.checked)}
        />
        <span>In stock only</span>
      </label>

      <div className="filter-group">
        <span className="filter-label">Categories</span>
        <ul className="category-list">
          <li>
            <button
              type="button"
              className={`category-btn${selectedCategory === '' ? ' is-active' : ''}`}
              onClick={() => onCategoryChange('')}
            >
              <span>All categories</span>
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.name}>
              <button
                type="button"
                className={`category-btn${selectedCategory === cat.name ? ' is-active' : ''}`}
                onClick={() => onCategoryChange(cat.name)}
              >
                <span>{cat.name.replace(/-/g, ' ')}</span>
                <span className="category-count">{cat.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
