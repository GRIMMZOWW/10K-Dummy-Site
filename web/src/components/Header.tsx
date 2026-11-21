import { Link } from 'react-router-dom';
import type { CategoryCount } from '../api/client';
import { SearchBar } from './SearchBar';

export type GridDensity = '3-col' | '4-col';

interface HeaderProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  density: GridDensity;
  onDensityChange: (density: GridDensity) => void;
  categories: CategoryCount[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  totalCatalogCount: number;
}

export function Header({
  searchText,
  onSearchChange,
  density,
  onDensityChange,
  categories,
  selectedCategory,
  onCategoryChange,
  totalCatalogCount,
}: HeaderProps) {
  const categoryCount = categories.length > 0 ? categories.length : 24;

  return (
    <header className="store-header">
      <div className="store-header-inner">
        <div className="store-header-top">
          <div className="brand-group">
            <Link to="/" className="brand-link">
              <span className="brand-mark" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </span>
              <span>Catalog</span>
            </Link>
            <span className="catalog-badge">
              {totalCatalogCount.toLocaleString()} SKUs · {categoryCount} Categories
            </span>
          </div>

          <div className="header-controls">
            <SearchBar value={searchText} onChange={onSearchChange} />

            <div className="density-toggle" role="group" aria-label="Grid density">
              <button
                type="button"
                className="density-btn"
                aria-pressed={density === '3-col'}
                onClick={() => onDensityChange('3-col')}
              >
                3-col
              </button>
              <button
                type="button"
                className="density-btn"
                aria-pressed={density === '4-col'}
                onClick={() => onDensityChange('4-col')}
              >
                4-col
              </button>
            </div>
          </div>
        </div>

        <nav className="category-ribbon" aria-label="Quick categories">
          <button
            type="button"
            className={`ribbon-pill${selectedCategory === '' ? ' is-active' : ''}`}
            onClick={() => onCategoryChange('')}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`ribbon-pill${selectedCategory === cat.name ? ' is-active' : ''}`}
              onClick={() => onCategoryChange(cat.name)}
            >
              {cat.name.replace(/-/g, ' ')}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
