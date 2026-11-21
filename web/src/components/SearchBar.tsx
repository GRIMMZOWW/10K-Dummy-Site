import { useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <form className="search-form" role="search" onSubmit={(e) => e.preventDefault()}>
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
        onChange={(e) => onChange(e.target.value)}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : (
        <kbd className="search-kbd" aria-hidden="true">
          /
        </kbd>
      )}
    </form>
  );
}
