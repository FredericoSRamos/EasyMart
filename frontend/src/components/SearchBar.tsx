import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  size?: 'sm' | 'lg';
  placeholder?: string;
}

export default function SearchBar({ query, setQuery, size = 'sm', placeholder = 'Buscar produtos...' }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(query);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync if query is cleared externally
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Call setQuery 400ms after the user stops typing
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setQuery(inputValue);
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [inputValue, setQuery]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setQuery(inputValue);
    }
  }

  const isLg = size === 'lg';

  return (
    <div className={`relative group${isLg ? ' w-full' : ''}`}>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-accent-primary transition-colors"
      >
        <Search size={isLg ? 20 : 18} />
      </div>
      <input
        type="text"
        aria-label="Buscar produtos"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={
          isLg
            ? 'bg-bg-secondary border border-white/15 rounded-xl py-3 pl-12 pr-6 text-base w-full lg:min-w-[480px] outline-none transition-all focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.3)] min-h-[2.5rem] text-text-primary placeholder:text-text-muted'
            : 'bg-bg-secondary border border-white/15 rounded-full py-2 pl-10 pr-4 text-sm w-72 outline-none transition-all focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.3)] min-h-[2.5rem] text-text-primary placeholder:text-text-muted'
        }
      />
    </div>
  );
}
