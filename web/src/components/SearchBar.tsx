import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, handleImageError } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { useProducts } from '../hooks/useProducts';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const containerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const trimmed = value.trim();
  const debouncedQuery = useDebounce(trimmed, 300);
  const previewActive = dropdownOpen && debouncedQuery.length >= 1;

  const previewQuery = useProducts(
    { q: debouncedQuery, page: 1, limit: 5 },
    previewActive,
  );

  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        return;
      }
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const previewItems = previewQuery.data?.items ?? [];

  return (
    <form
      ref={containerRef}
      className="search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setDropdownOpen(false);
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Search products
      </label>
      <svg
        className="search-icon"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        id="catalog-search"
        type="search"
        className="search-input"
        placeholder="Search titles, descriptions, or tags"
        value={value}
        maxLength={100}
        autoComplete="off"
        aria-expanded={previewActive}
        aria-controls="instant-search-results"
        onFocus={() => {
          if (trimmed.length >= 1) setDropdownOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setDropdownOpen(e.target.value.trim().length >= 1);
        }}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            setDropdownOpen(false);
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : (
        <kbd className="search-kbd" aria-hidden="true">
          /
        </kbd>
      )}

      {previewActive && (
        <div
          id="instant-search-results"
          className="search-dropdown"
          role="region"
          aria-label="Quick search matches"
        >
          {previewQuery.isPending ? (
            <div className="search-dropdown-status">Searching catalog...</div>
          ) : previewItems.length === 0 ? (
            <div className="search-dropdown-status">No quick matches</div>
          ) : (
            <ul className="search-dropdown-list">
              {previewItems.map((item) => (
                <li key={item._id}>
                  <Link
                    to={`/products/${item.slug}`}
                    className="search-option"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <img
                      src={item.thumbnail}
                      alt=""
                      loading="lazy"
                      className="search-option-thumb"
                      onError={handleImageError}
                    />
                    <span className="search-option-meta">
                      <span className="search-option-title">{item.title}</span>
                      <span className="search-option-cat">
                        {item.category.replace(/-/g, ' ')}
                      </span>
                    </span>
                    <span className="search-option-price">
                      {formatPrice(item.price)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
