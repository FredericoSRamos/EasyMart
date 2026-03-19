import { useState, useEffect, useCallback } from 'react';
import { marketService, categoryService, productService } from '../services/api';
import type { Market, Category, Product } from '../services/api';
import { useSearch } from '../context/SearchContext';
import CategorySidebar from '../components/CategorySidebar';
import SortControl from '../components/SortControl';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

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
  const [totalCount, setTotalCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

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
    setLoadingProducts(true);
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
      .then((res) => { setProducts(res.data.results); setTotalCount(res.data.count); })
      .catch(() => setProductsError('Nao foi possivel carregar os produtos.'))
      .finally(() => setLoadingProducts(false));
  }, [selectedMarket, selectedCategory, query, ordering, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page when search query changes
  useEffect(() => { setPage(1); }, [query]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSelectedCategory(null);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="animate-fade-in flex flex-col h-full">

      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-6 py-3 border-b border-border flex-wrap bg-bg-secondary/40">
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
      <div className="flex flex-1 min-h-0">

        {/* Category sidebar */}
        <aside className="w-44 shrink-0 border-r border-border flex flex-col">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={(id) => { setSelectedCategory(id); setPage(1); }}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto px-8 py-5 space-y-4">
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

              {productsError ? (
                <ErrorState message={productsError} onRetry={fetchProducts} />
              ) : loadingProducts ? (
                <LoadingState variant="product-grid" />
              ) : products.length === 0 ? (
                <EmptyState
                  message="Nenhum produto encontrado."
                  onReset={() => { setSelectedCategory(null); setPage(1); }}
                />
              ) : (
                <>
                  <div className="grid [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))] gap-6">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showMarket={false}
                        marketName={selectedMarket.name}
                      />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
