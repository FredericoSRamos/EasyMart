export interface LoadingStateProps {
  variant: 'product-grid' | 'sidebar' | 'market-grid';
  count?: number;
}

function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] gap-8"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden bg-bg-tertiary">
          {/* Image placeholder */}
          <div className="shimmer h-52 rounded-t-lg" />
          <div className="p-3 flex flex-col gap-2">
            {/* Text line 1 */}
            <div className="shimmer h-3.5 rounded w-3/5" />
            {/* Text line 2 */}
            <div className="shimmer h-3.5 rounded w-4/5" />
            {/* Price placeholder */}
            <div className="shimmer h-3.5 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketGridSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label="Loading markets"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden bg-bg-tertiary p-5 flex flex-col gap-3">
          {/* Title placeholder */}
          <div className="shimmer h-3.5 rounded w-3/5" />
          <div className="shimmer h-3.5 rounded w-2/5" />
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton({ count }: { count: number }) {
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading categories"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer h-8 w-full rounded-md" />
      ))}
    </div>
  );
}

export default function LoadingState({ variant, count }: LoadingStateProps) {
  const defaults = { 'product-grid': 6, 'market-grid': 3, sidebar: 8 };
  const resolvedCount = count ?? defaults[variant];

  return (
    <>
      {variant === 'product-grid' && <ProductGridSkeleton count={resolvedCount} />}
      {variant === 'market-grid' && <MarketGridSkeleton count={resolvedCount} />}
      {variant === 'sidebar' && <SidebarSkeleton count={resolvedCount} />}
    </>
  );
}
