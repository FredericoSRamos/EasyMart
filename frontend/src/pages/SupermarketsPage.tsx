import { useState, useEffect, useCallback } from 'react';
import { marketService, categoryService, productService } from '../services/api';
import type { Market, Category, Product } from '../services/api';
import { useSearch } from '../context/SearchContext';
import CategorySidebar from '../components/CategorySidebar';
import SortControl from '../components/SortControl';
import ProductGrid from '../components/ProductGrid';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { SlidersHorizontal } from 'lucide-react';

const PAGE_SIZE = 12;

export default function SupermarketsPage() {
  const { query } = useSearch();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [ordering, setOrdering] = useState('price');
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchMarkets = useCallback(() => {
    setLoadingMarkets(true);
    setMarketsError(null);
    marketService
      .getMarkets()
      .then((res) => setMarkets(res.data.results))
      .catch(() => setMarketsError('Nao foi possivel carregar os mercados.'))
      .finally(() => setLoadingMarkets(false));
  }, []);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  useEffect(() => {
    if (!selectedMarket) { setCategories([]); return; }
    categoryService
      .getCategories(undefined, selectedMarket.slug)
      .then((res) => setCategories(res.data.results))
      .catch(() => setCategories([]));
  }, [selectedMarket]);

  const fetchProducts = useCallback(() => {
    if (!selectedMarket) return;
    if (page === 1) setLoadingProducts(true);
    else setLoadingMore(true);
    setProductsError(null);

    productService
      .getProducts({
        market_slug: selectedMarket.slug,
        category_id: selectedCategory ?? undefined,
        search: query || undefined,
        ordering,
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
      .catch(() => setProductsError('Nao foi possivel carregar os produtos.'))
      .finally(() => {
        setLoadingProducts(false);
        setLoadingMore(false);
      });
  }, [selectedMarket, selectedCategory, query, ordering, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(true);
    const mainContent = document.getElementById('main-scroller');
    if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedMarket, selectedCategory, query, ordering]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSelectedCategory(null);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full relative">

      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-border overflow-x-auto md:flex-wrap flex-nowrap bg-bg-secondary/40 categories">
        <span className="text-[0.65rem] font-semibold text-text-muted uppercase tracking-widest shrink-0">Mercado</span>
        {loadingMarkets ? (
          <span className="text-sm text-text-muted">A carregar...</span>
        ) : marketsError ? (
          <span className="text-sm text-error">{marketsError}</span>
        ) : (
          markets.map((market) => (
            <button
              key={market.id}
              onClick={() => handleSelectMarket(market)}
              className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                selectedMarket?.id === market.id
                  ? 'bg-accent-primary border-accent-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                  : 'border-white/12 text-text-secondary hover:bg-white/8 hover:text-text-primary hover:border-white/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
              }`}
            >
              {market.name}
            </button>
          ))
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 relative">

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

        {/* Category sidebar / Drawer */}
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
          <div className="flex-1 overflow-y-auto">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={(id) => { setSelectedCategory(id); setPage(1); if (window.innerWidth < 1024) setSidebarOpen(false); }}
            />
          </div>
        </aside>

        {/* Main content */}
        <div id="main-scroller" className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-4 lg:py-5 space-y-4">
          {!selectedMarket ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-text-secondary">Selecione um mercado para ver os produtos</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">{selectedMarket.name}</h2>
                <SortControl value={ordering} onChange={(v) => { setOrdering(v); setPage(1); }} />
              </div>

              {productsError && page === 1 ? (
                <ErrorState message={productsError} onRetry={fetchProducts} />
              ) : loadingProducts ? (
                <LoadingState variant="product-grid" />
              ) : products.length === 0 ? (
                <EmptyState
                  message="Nenhum produto encontrado."
                  onReset={() => { setSelectedCategory(null); setPage(1); }}
                />
              ) : (
                  <ProductGrid
                    products={products}
                    showMarket={false}
                    marketName={selectedMarket.name}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={() => setPage((p) => p + 1)}
                    error={productsError}
                    page={page}
                    onRetry={fetchProducts}
                  />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
