import { useEffect, useMemo, useState } from 'react';
import type { CategoryCount, ProductSort } from '../api/client';

interface PricePreset {
  label: string;
  min: string;
  max: string;
}

const PRICE_PRESETS: PricePreset[] = [
  { label: 'Under $50', min: '', max: '50' },
  { label: '$50–$200', min: '50', max: '200' },
  { label: '$200–$1,000', min: '200', max: '1000' },
  { label: '$1,000+', min: '1000', max: '' },
];

interface FilterSidebarProps {
  categories: CategoryCount[];
  selectedCategory: string;
  minPriceInput: string;
  maxPriceInput: string;
  priceError: string | null;
  inStock: boolean;
  sort: ProductSort;
  hasActiveFilters: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange: (category: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onPricePreset: (min: string, max: string) => void;
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
  isOpen,
  onClose,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onPricePreset,
  onInStockChange,
  onSortChange,
  onReset,
}: FilterSidebarProps) {
  const [catFilter, setCatFilter] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const visibleCategories = useMemo(() => {
    const q = catFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, catFilter]);

  return (
    <div className={`sidebar-desktop-wrap${isOpen ? ' is-open' : ''}`}>
      <div className="sidebar-backdrop" aria-hidden="true" onClick={onClose} />
      <aside className="sidebar" aria-label="Catalog filters">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Filters</h2>
          <div>
            {hasActiveFilters && (
              <button type="button" className="btn-link" onClick={onReset}>
                Reset
              </button>
            )}
            <button type="button" className="sidebar-close-btn" onClick={onClose}>
              Done
            </button>
          </div>
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
          <div className="preset-chips">
            {PRICE_PRESETS.map((preset) => {
              const active =
                minPriceInput === preset.min && maxPriceInput === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`preset-chip${active ? ' is-active' : ''}`}
                  onClick={() =>
                    active
                      ? onPricePreset('', '')
                      : onPricePreset(preset.min, preset.max)
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
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
                placeholder="Min"
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
                placeholder="Max"
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
          <label htmlFor="category-filter-input" className="filter-label">
            Categories
          </label>
          <input
            id="category-filter-input"
            type="search"
            className="text-input"
            placeholder="Filter categories..."
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          />
          <ul className="category-list">
            <li>
              <button
                type="button"
                className={`category-btn${selectedCategory === '' ? ' is-active' : ''}`}
                onClick={() => {
                  onCategoryChange('');
                  onClose();
                }}
              >
                <span className="category-name-wrap">
                  {selectedCategory === '' && (
                    <span className="category-indicator" aria-hidden="true" />
                  )}
                  <span>All categories</span>
                </span>
              </button>
            </li>
            {visibleCategories.map((cat) => {
              const active = selectedCategory === cat.name;
              return (
                <li key={cat.name}>
                  <button
                    type="button"
                    className={`category-btn${active ? ' is-active' : ''}`}
                    onClick={() => {
                      onCategoryChange(cat.name);
                      onClose();
                    }}
                  >
                    <span className="category-name-wrap">
                      {active && (
                        <span className="category-indicator" aria-hidden="true" />
                      )}
                      <span>{cat.name.replace(/-/g, ' ')}</span>
                    </span>
                    <span className="category-count">{cat.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
