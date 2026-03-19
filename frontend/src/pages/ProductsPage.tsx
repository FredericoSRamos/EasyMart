import { useState, useEffect, useCallback } from 'react';
import { marketService, productService } from '../services/api';
import type { Market, Product } from '../services/api';
import { useSearch } from '../context/SearchContext';
import { SORT_OPTIONS } from '../components/SortControl';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { Tag } from 'lucide-react';

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const { query, setQuery, ordering, setOrdering, selectedMarkets, setSelectedMarkets, onPromo, setOnPromo } = useSearch();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketService
      .getMarkets()
      .then((res) => setMarkets(res.data.results))
      .catch(() => setError('Nao foi possivel carregar os mercados.'))
      .finally(() => setLoadingMarkets(false));
  }, []);

  useEffect(() => { setPage(1); }, [query, selectedMarkets, ordering, onPromo]);

  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    setError(null);
    productService      .getProducts({
        search: query || undefined,
        market_ids: selectedMarkets.length ? selectedMarkets : undefined,
        ordering,
        on_promo: onPromo || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => { setProducts(res.data.results); setTotalCount(res.data.count); })
      .catch(() => setError('Nao foi possivel carregar os produtos.'))
      .finally(() => setLoadingProducts(false));
  }, [query, selectedMarkets, ordering, onPromo, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function toggleMarket(id: number) {
    setSelectedMarkets(
      selectedMarkets.includes(id)
        ? selectedMarkets.filter((m) => m !== id)
        : [...selectedMarkets, id]
    );
  }

  return (
    <div className="animate-fade-in flex flex-1 min-h-0">

      {/* Left sidebar */}
      <aside className="w-44 shrink-0 border-r border-border flex flex-col">
        <nav className="flex flex-col h-full" aria-label="Filtros">
          {/* Markets section */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <p className="text-[0.65rem] font-semibold text-text-muted uppercase tracking-widest px-1 mb-2">
              Mercados
            </p>
            <hr className="border-border/40" />
          </div>
          <div className="flex flex-col gap-0.5 px-3 pb-2">
            {loadingMarkets ? (
              <p className="text-xs text-text-muted px-1 py-2">A carregar...</p>
            ) : (
              <>
                <button
                  onClick={() => setSelectedMarkets([])}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all border-l-2 ${
                    selectedMarkets.length === 0
                      ? 'bg-accent-primary/15 text-accent-primary font-semibold border-accent-primary'
                      : 'text-text-secondary hover:bg-white/8 hover:text-text-primary border-transparent hover:border-white/20'
                  }`}
                >
                  Todos
                </button>
                {markets.map((market) => (
                  <button
                    key={market.id}
                    onClick={() => toggleMarket(market.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all border-l-2 ${
                      selectedMarkets.includes(market.id)
                        ? 'bg-accent-primary/15 text-accent-primary font-semibold border-accent-primary'
                        : 'text-text-secondary hover:bg-white/8 hover:text-text-primary border-transparent hover:border-white/20'
                    }`}
                  >
                    {market.name}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Promo toggle */}
          <div className="px-3 pt-3 pb-3">
            <button
              onClick={() => setOnPromo(!onPromo)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                onPromo
                  ? 'bg-red-500/15 text-red-400 border-red-500/40'
                  : 'text-text-secondary border-transparent hover:bg-white/6 hover:text-text-primary'
              }`}
            >
              <Tag size={13} />
              Só promoções
            </button>
          </div>

          <hr className="border-border/40 mx-3" />

          {/* Sort section */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <p className="text-[0.65rem] font-semibold text-text-muted uppercase tracking-widest px-1 mb-2">
              Ordenar por
            </p>
            <hr className="border-border/40" />
          </div>
          <div className="flex flex-col gap-0.5 px-3 pb-3">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrdering(opt.value)}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all border-l-2 ${
                  ordering === opt.value
                    ? 'bg-accent-primary/15 text-accent-primary font-semibold border-accent-primary'
                    : 'text-text-secondary hover:bg-white/8 hover:text-text-primary border-transparent hover:border-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto px-8 py-5 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={fetchProducts} />
        ) : loadingProducts ? (
          <LoadingState variant="product-grid" />
        ) : products.length === 0 ? (
          <EmptyState
            message="Nenhum produto encontrado."
            queryText={query || undefined}
            onClearSearch={query ? () => setQuery('') : undefined}
            onReset={() => { setQuery(''); setSelectedMarkets([]); setOnPromo(false); }}
          />
        ) : (
          <>
            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))] max-[1400px]:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', maxWidth: '100%' }}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showMarket={selectedMarkets.length !== 1}
                  marketName={
                    markets.find((m) => m.slug === product.market_slug)?.name ??
                    product.market_slug
                  }
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
