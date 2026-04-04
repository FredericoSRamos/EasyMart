import { useState, useEffect, useCallback } from 'react';
import { marketService, productService } from '../services/api';
import type { Market, Product } from '../services/api';
import { useSearch } from '../context/SearchContext';
import { SORT_OPTIONS } from '../components/SortControl';
import ProductGrid from '../components/ProductGrid';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { Tag, SlidersHorizontal } from 'lucide-react';

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const { query, setQuery, ordering, setOrdering, selectedMarkets, setSelectedMarkets, onPromo, setOnPromo } = useSearch();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    marketService
      .getMarkets()
      .then((res) => setMarkets(res.data.results))
      .catch(() => setError('Nao foi possivel carregar os mercados.'))
      .finally(() => setLoadingMarkets(false));
  }, []);

  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(true);
    // Scroll to top
    const mainContent = document.getElementById('main-scroller');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [query, selectedMarkets, ordering, onPromo]);

  const fetchProducts = useCallback(() => {
    if (page === 1) {
      setLoadingProducts(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    productService
      .getProducts({
        search: query || undefined,
        market_ids: selectedMarkets.length ? selectedMarkets : undefined,
        ordering,
        on_promo: onPromo || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        setHasMore(res.data.next !== null);
        if (page === 1) {
          setProducts(res.data.results);
        } else {
          setProducts((prev) => {
            const newProducts = res.data.results.filter(
              (p) => !prev.some((existing) => existing.id === p.id)
            );
            return [...prev, ...newProducts];
          });
        }
      })
      .catch(() => setError('Nao foi possivel carregar os produtos.'))
      .finally(() => {
        setLoadingProducts(false);
        setLoadingMore(false);
      });
  }, [query, selectedMarkets, ordering, onPromo, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function toggleMarket(id: number) {
    setSelectedMarkets(
      selectedMarkets.includes(id)
        ? selectedMarkets.filter((m) => m !== id)
        : [...selectedMarkets, id]
    );
  }

  return (
    <div className="animate-fade-in flex flex-1 min-h-0 relative">

      {/* Mobile filter FAB */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-full shadow-lg font-medium transition-transform active:scale-95"
        onClick={() => setSidebarOpen(true)}
      >
        <SlidersHorizontal size={20} />
        <span>Filtros</span>
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left sidebar / Drawer */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 z-50 bg-bg-secondary transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:translate-x-0 lg:w-56 lg:shrink-0 lg:border-r lg:border-border lg:z-10 flex flex-col
      `}>
        {sidebarOpen && (
           <div className="lg:hidden px-3 pt-4 pb-2 border-b border-white/5 flex justify-between items-center bg-bg-secondary sticky top-0 z-10">
             <span className="font-semibold text-text-primary px-1">Filtros</span>
             <button onClick={() => setSidebarOpen(false)} className="p-2 text-text-secondary hover:text-text-primary">
               ✕
             </button>
           </div>
        )}
        <nav className="flex flex-col flex-1 overflow-y-auto" aria-label="Filtros">
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
      <div id="main-scroller" className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-4 lg:py-5 space-y-4">
        {error && page === 1 ? (
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
          <ProductGrid
            products={products}
            markets={markets}
            showMarket={selectedMarkets.length !== 1}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={() => setPage((p) => p + 1)}
            error={error}
            page={page}
            onRetry={fetchProducts}
          />
        )}
      </div>
    </div>
  );
}
