import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollLoaderProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  rootMargin?: string;
}

export default function InfiniteScrollLoader({
  onLoadMore,
  hasMore,
  loading,
  rootMargin = '300px',
}: InfiniteScrollLoaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, rootMargin]);

  return (
    <div ref={sentinelRef} className="w-full flex justify-center py-8">
      {loading && hasMore && (
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      )}
    </div>
  );
}
