import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductFilters, ProductSort } from '../api/client';
import { ActiveFilters } from '../components/ActiveFilters';
import { FilterSidebar } from '../components/FilterSidebar';
import { Header, type GridDensity } from '../components/Header';
import { Pagination } from '../components/Pagination';
import { ProductGrid } from '../components/ProductGrid';
import { QuickViewDrawer } from '../components/QuickViewDrawer';
import { Skeleton } from '../components/Skeleton';
import { SpotlightStrip } from '../components/SpotlightStrip';
import { useDebounce } from '../hooks/useDebounce';
import { useCategories, useProducts } from '../hooks/useProducts';

const VALID_SORTS = new Set<ProductSort>([
  'relevance',
  'price_asc',
  'price_desc',
  'rating_desc',
  'newest',
]);

const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const MAX_MAJOR_PRICE = 10_000_000;
const MAX_PAGE = 1_000_000;

function sanitizePriceParam(raw: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!PRICE_PATTERN.test(trimmed)) return '';
  const num = Number(trimmed);
  return Number.isFinite(num) && num <= MAX_MAJOR_PRICE ? trimmed : '';
}

function validatePriceInputs(minRaw: string, maxRaw: string): {
  validMin?: string;
  validMax?: string;
  error: string | null;
} {
  const minTrim = minRaw.trim();
  const maxTrim = maxRaw.trim();

  if (minTrim !== '' && (!PRICE_PATTERN.test(minTrim) || Number(minTrim) > MAX_MAJOR_PRICE)) {
    return { error: 'Min price must be a non-negative amount with up to 2 decimals.' };
  }
  if (maxTrim !== '' && (!PRICE_PATTERN.test(maxTrim) || Number(maxTrim) > MAX_MAJOR_PRICE)) {
    return { error: 'Max price must be a non-negative amount with up to 2 decimals.' };
  }
  if (minTrim !== '' && maxTrim !== '' && Number(minTrim) > Number(maxTrim)) {
    return { error: 'Min price cannot exceed max price.' };
  }

  return {
    validMin: minTrim || undefined,
    validMax: maxTrim || undefined,
    error: null,
  };
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQ = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const urlCategory = (searchParams.get('category') ?? '').trim().slice(0, 100);
  const rawSafeMin = sanitizePriceParam(searchParams.get('minPrice'));
  const rawSafeMax = sanitizePriceParam(searchParams.get('maxPrice'));
  const urlMinPrice =
    rawSafeMin && rawSafeMax && Number(rawSafeMin) > Number(rawSafeMax) ? '' : rawSafeMin;
  const urlMaxPrice =
    rawSafeMin && rawSafeMax && Number(rawSafeMin) > Number(rawSafeMax) ? '' : rawSafeMax;
  const urlInStock = searchParams.get('inStock') === 'true';
  const rawSort = searchParams.get('sort') as ProductSort | null;
  const urlSort: ProductSort = rawSort && VALID_SORTS.has(rawSort) ? rawSort : 'relevance';
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const urlPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, MAX_PAGE) : 1;

  const [searchText, setSearchText] = useState(urlQ);
  const [minPriceInput, setMinPriceInput] = useState(urlMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(urlMaxPrice);
  const [density, setDensity] = useState<GridDensity>('4-col');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  const lastCommittedQRef = useRef(urlQ);
  const lastCommittedMinRef = useRef(urlMinPrice);
  const lastCommittedMaxRef = useRef(urlMaxPrice);

  useEffect(() => {
    if (urlQ === lastCommittedQRef.current) return;
    lastCommittedQRef.current = urlQ;
    setSearchText(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (urlMinPrice === lastCommittedMinRef.current) return;
    lastCommittedMinRef.current = urlMinPrice;
    setMinPriceInput(urlMinPrice);
  }, [urlMinPrice]);

  useEffect(() => {
    if (urlMaxPrice === lastCommittedMaxRef.current) return;
    lastCommittedMaxRef.current = urlMaxPrice;
    setMaxPriceInput(urlMaxPrice);
  }, [urlMaxPrice]);

  const debouncedQ = useDebounce(searchText.trim().slice(0, 100), 200);
  const debouncedMin = useDebounce(minPriceInput, 300);
  const debouncedMax = useDebounce(maxPriceInput, 300);

  const livePriceCheck = useMemo(
    () => validatePriceInputs(minPriceInput, maxPriceInput),
    [minPriceInput, maxPriceInput],
  );

  const commitQueryToUrl = (nextQ: string) => {
    if (nextQ === urlQ) return;
    lastCommittedQRef.current = nextQ;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextQ) next.set('q', nextQ);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    commitQueryToUrl(debouncedQ);
  }, [debouncedQ, urlQ, setSearchParams]);

  useEffect(() => {
    const check = validatePriceInputs(debouncedMin, debouncedMax);
    if (check.error) return;
    const nextMin = check.validMin ?? '';
    const nextMax = check.validMax ?? '';
    if (nextMin === urlMinPrice && nextMax === urlMaxPrice) return;

    lastCommittedMinRef.current = nextMin;
    lastCommittedMaxRef.current = nextMax;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextMin) next.set('minPrice', nextMin);
        else next.delete('minPrice');
        if (nextMax) next.set('maxPrice', nextMax);
        else next.delete('maxPrice');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedMin, debouncedMax, urlMinPrice, urlMaxPrice, setSearchParams]);

  const filters: ProductFilters = useMemo(
    () => ({
      q: urlQ || undefined,
      category: urlCategory || undefined,
      minPrice: urlMinPrice || undefined,
      maxPrice: urlMaxPrice || undefined,
      inStock: urlInStock || undefined,
      sort: urlSort,
      page: urlPage,
    }),
    [urlQ, urlCategory, urlMinPrice, urlMaxPrice, urlInStock, urlSort, urlPage],
  );

  const productsQuery = useProducts(filters);
  const categoriesQuery = useCategories();

  const updateParam = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    });
  };

  const handleCategoryChange = (cat: string) =>
    updateParam((next) => {
      if (cat) next.set('category', cat);
      else next.delete('category');
      next.delete('page');
    });

  const handlePricePreset = (min: string, max: string) => {
    lastCommittedMinRef.current = min;
    lastCommittedMaxRef.current = max;
    setMinPriceInput(min);
    setMaxPriceInput(max);
    updateParam((next) => {
      if (min) next.set('minPrice', min);
      else next.delete('minPrice');
      if (max) next.set('maxPrice', max);
      else next.delete('maxPrice');
      next.delete('page');
    });
  };

  const handleReset = () => {
    lastCommittedQRef.current = '';
    lastCommittedMinRef.current = '';
    lastCommittedMaxRef.current = '';
    setSearchText('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    urlQ ||
      urlCategory ||
      urlMinPrice ||
      urlMaxPrice ||
      urlInStock ||
      urlSort !== 'relevance',
  );

  const showSpotlight =
    urlPage === 1 &&
    !urlQ &&
    !urlCategory &&
    !urlMinPrice &&
    !urlMaxPrice &&
    !urlInStock;

  const categories = categoriesQuery.data ?? [];
  const data = productsQuery.data;

  return (
    <div className="app-shell">
      <Header
        searchText={searchText}
        onSearchChange={setSearchText}
        onSearchSubmit={() => commitQueryToUrl(searchText.trim().slice(0, 100))}
        onSearchClear={() => {
          setSearchText('');
          commitQueryToUrl('');
        }}
        density={density}
        onDensityChange={setDensity}
        categories={categories}
        selectedCategory={urlCategory}
        onCategoryChange={handleCategoryChange}
      />

      <div className="mobile-filter-bar">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setMobileFiltersOpen(true)}
        >
          Filters{hasActiveFilters ? ' (active)' : ''}
        </button>
      </div>

      <div className="catalog-layout">
        <FilterSidebar
          categories={categories}
          selectedCategory={urlCategory}
          minPriceInput={minPriceInput}
          maxPriceInput={maxPriceInput}
          priceError={livePriceCheck.error}
          inStock={urlInStock}
          sort={urlSort}
          hasActiveFilters={hasActiveFilters}
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          onCategoryChange={handleCategoryChange}
          onMinPriceChange={setMinPriceInput}
          onMaxPriceChange={setMaxPriceInput}
          onPricePreset={handlePricePreset}
          onInStockChange={(checked) =>
            updateParam((next) => {
              if (checked) next.set('inStock', 'true');
              else next.delete('inStock');
              next.delete('page');
            })
          }
          onSortChange={(nextSort) =>
            updateParam((next) => {
              if (nextSort !== 'relevance') next.set('sort', nextSort);
              else next.delete('sort');
              next.delete('page');
            })
          }
          onReset={handleReset}
        />

        <main className="catalog-main">
          <SpotlightStrip visible={showSpotlight} />

          {data && (
            <ActiveFilters
              page={data.page}
              limit={data.limit}
              itemCount={data.items.length}
              total={data.total}
              isFetching={productsQuery.isFetching}
              q={urlQ}
              category={urlCategory}
              minPrice={urlMinPrice}
              maxPrice={urlMaxPrice}
              inStock={urlInStock}
              onClearQ={() => {
                lastCommittedQRef.current = '';
                setSearchText('');
                updateParam((next) => {
                  next.delete('q');
                  next.delete('page');
                });
              }}
              onClearCategory={() => handleCategoryChange('')}
              onClearPrice={() => handlePricePreset('', '')}
              onClearInStock={() =>
                updateParam((next) => {
                  next.delete('inStock');
                  next.delete('page');
                })
              }
              onClearAll={handleReset}
            />
          )}

          {productsQuery.isPending ||
          (productsQuery.isFetching &&
            productsQuery.isPlaceholderData &&
            data?.items.length === 0) ? (
            <Skeleton count={12} />
          ) : productsQuery.isError ? (
            <div className="state-panel is-error" role="alert">
              <h2 className="state-title">Could not load products</h2>
              <p className="state-copy">
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : 'Unexpected error while loading catalog.'}
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void productsQuery.refetch()}
              >
                Try again
              </button>
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="state-panel">
              <h2 className="state-title">No matching products</h2>
              <p className="state-copy">
                Adjust your search terms or clear active price and category filters.
              </p>
              {hasActiveFilters && (
                <button type="button" className="btn-primary" onClick={handleReset}>
                  Clear filters
                </button>
              )}
            </div>
          ) : data ? (
            <>
              <ProductGrid
                items={data.items}
                isDimmed={productsQuery.isPlaceholderData}
                density={density}
                onQuickView={setQuickViewSlug}
              />
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(nextPage) =>
                  updateParam((next) => {
                    if (nextPage > 1) next.set('page', String(nextPage));
                    else next.delete('page');
                  })
                }
              />
            </>
          ) : null}
        </main>
      </div>

      <QuickViewDrawer
        slug={quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </div>
  );
}
