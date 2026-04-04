import type { Product, Market } from '../services/api';
import ProductCard from './ProductCard';
import InfiniteScrollLoader from './InfiniteScrollLoader';

interface ProductGridProps {
  products: Product[];
  markets?: Market[];
  showMarket?: boolean;
  marketName?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  error?: string | null;
  page: number;
  onRetry?: () => void;
}

export default function ProductGrid({
  products,
  markets = [],
  showMarket = true,
  marketName,
  hasMore,
  loadingMore,
  onLoadMore,
  error,
  page,
  onRetry,
}: ProductGridProps) {
  return (
    <>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 w-full"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showMarket={showMarket}
            marketName={
              marketName ||
              markets.find((m) => m.slug === product.market_slug)?.name ||
              product.market_slug
            }
          />
        ))}
      </div>

      {error && page > 1 && (
        <div className="py-4 text-center text-red-400">
          <p>Ocorreu um erro ao carregar mais produtos.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-accent-primary underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <InfiniteScrollLoader
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
      />
    </>
  );
}
