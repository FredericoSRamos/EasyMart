import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import InfiniteScrollLoader from '../../components/InfiniteScrollLoader';

describe('InfiniteScrollLoader', () => {
  let mockIntersect: (entries: IntersectionObserverEntry[]) => void;
  let observeSpy: ReturnType<typeof vi.fn>;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();

    window.IntersectionObserver = vi.fn().mockImplementation(function (callback: any) {
      mockIntersect = callback;
      return {
        observe: observeSpy,
        disconnect: disconnectSpy,
        unobserve: vi.fn(),
        takeRecords: () => [],
      };
    }) as any;
  });

  it('calls onLoadMore when sentinel is intersecting', () => {
    const onLoadMore = vi.fn();
    render(<InfiniteScrollLoader onLoadMore={onLoadMore} hasMore={true} loading={false} />);

    mockIntersect([{ isIntersecting: true } as IntersectionObserverEntry]);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onLoadMore when not intersecting', () => {
    const onLoadMore = vi.fn();
    render(<InfiniteScrollLoader onLoadMore={onLoadMore} hasMore={true} loading={false} />);

    mockIntersect([{ isIntersecting: false } as IntersectionObserverEntry]);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does NOT call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn();
    render(<InfiniteScrollLoader onLoadMore={onLoadMore} hasMore={false} loading={false} />);

    // Since hasMore is false, the observer doesn't get created.
    expect(window.IntersectionObserver).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does NOT call onLoadMore when already loading', () => {
    const onLoadMore = vi.fn();
    render(<InfiniteScrollLoader onLoadMore={onLoadMore} hasMore={true} loading={true} />);

    // Since loading is true, observer doesn't get created.
    expect(window.IntersectionObserver).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('shows spinner when loading and hasMore', () => {
    const { container } = render(<InfiniteScrollLoader onLoadMore={vi.fn()} hasMore={true} loading={true} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('shows nothing when hasMore is false and not loading', () => {
    const { container } = render(<InfiniteScrollLoader onLoadMore={vi.fn()} hasMore={false} loading={false} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeNull();
  });

  it('cleans up observer on unmount', () => {
    const { unmount } = render(<InfiniteScrollLoader onLoadMore={vi.fn()} hasMore={true} loading={false} />);

    expect(observeSpy).toHaveBeenCalled();
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
