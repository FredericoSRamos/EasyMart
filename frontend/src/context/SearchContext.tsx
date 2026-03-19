import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  selectedMarkets: number[];
  setSelectedMarkets: (ids: number[]) => void;
  onPromo: boolean;
  setOnPromo: (v: boolean) => void;
  ordering: string;
  setOrdering: (v: string) => void;
}

export const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<number[]>([]);
  const [onPromo, setOnPromo] = useState(false);
  const [ordering, setOrdering] = useState('price');

  return (
    <SearchContext.Provider value={{ query, setQuery, selectedMarkets, setSelectedMarkets, onPromo, setOnPromo, ordering, setOrdering }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return ctx;
}
