"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ParkSearchResult } from "@/types/park";

interface ParkSearchProps {
  onSelectPark: (park: ParkSearchResult) => void;
}

export function ParkSearch({ onSelectPark }: ParkSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParkSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/parks/search?q=${encodeURIComponent(value.trim())}`,
        );
        if (!response.ok) throw new Error("Search failed");
        const data: ParkSearchResult[] = await response.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (error) {
        console.error("Park search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  }, []);

  const handleSelect = useCallback(
    (park: ParkSearchResult) => {
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectPark(park);
    },
    [onSelectPark],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            handleSelect(results[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, highlightedIndex, handleSelect],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="flex items-center rounded-lg bg-white shadow-md">
        {/* Search icon */}
        <div className="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search parks…"
          className="h-10 w-48 bg-transparent pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none sm:w-56"
        />

        {/* Loading spinner or clear button */}
        {isLoading ? (
          <div className="flex h-10 w-8 items-center justify-center pr-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-700" />
          </div>
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="flex h-10 w-8 items-center justify-center pr-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 max-h-72 w-72 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          {results.map((park, index) => (
            <li key={park.unitCode}>
              <button
                type="button"
                onClick={() => handleSelect(park)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${
                  index === highlightedIndex
                    ? "bg-green-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="text-sm font-medium text-gray-900 leading-tight">
                  {park.unitName}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  {park.unitType && (
                    <>
                      <span>{park.unitType}</span>
                      {park.state && <span>·</span>}
                    </>
                  )}
                  {park.state && <span>{park.state}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen &&
        results.length === 0 &&
        !isLoading &&
        query.trim().length >= 2 && (
          <div className="absolute left-0 top-full mt-1 w-72 rounded-lg bg-white px-3 py-3 shadow-lg ring-1 ring-black/5">
            <p className="text-center text-sm text-gray-500">No parks found</p>
          </div>
        )}
    </div>
  );
}
