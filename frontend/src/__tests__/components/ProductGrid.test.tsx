import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ProductGrid from '../../components/ProductGrid';
import type { Product, Market } from '../../services/api';

vi.mock('../../components/InfiniteScrollLoader', () => ({
  default: () => <div data-testid="infinite-scroll-loader" />
}));

describe('ProductGrid', () => {
  const mockProduct: Product = {
    id: 1,
    name: 'Apple',
    price: '1.99',
    promo_price: null,
    on_promo: false,
    market: 1,
    market_slug: 'market-1',
    categories: [],
    categories_names: [],
    last_scraped_at: '2024-01-01',
  };

  const mockMarkets: Market[] = [
    { id: 1, name: 'Market One', slug: 'market-1', domain: 'test.com' },
  ];

  it('renders product cards', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={1}
      />
    );
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('shows market name on cards when showMarket is true', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        markets={mockMarkets}
        showMarket={true}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={1}
      />
    );
    expect(screen.getByText('Market One')).toBeTruthy();
  });

  it('hides market name when showMarket is false', () => {
    const { container } = render(
      <ProductGrid
        products={[mockProduct]}
        markets={mockMarkets}
        showMarket={false}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={1}
      />
    );
    // Since market name is uppercase in the card but rendered normally, let's query all text
    expect(screen.queryByText('Market One')).toBeNull();
  });

  it('shows generic market slug if market is not found', () => {
    const unknownProduct = { ...mockProduct, market_slug: 'unknown-slug' };
    render(
      <ProductGrid
        products={[unknownProduct]}
        markets={mockMarkets} // Doesn't contain unknown-slug
        showMarket={true}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={1}
      />
    );
    expect(screen.getByText('unknown-slug')).toBeTruthy();
  });

  it('shows inline error with retry button on page > 1', () => {
    const onRetry = vi.fn();
    render(
      <ProductGrid
        products={[mockProduct]}
        hasMore={true}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={2}
        error="Test error"
        onRetry={onRetry}
      />
    );
    expect(screen.getByText('Ocorreu um erro ao carregar mais produtos.')).toBeTruthy();
    const retryBtn = screen.getByText('Tentar novamente');
    expect(retryBtn).toBeTruthy();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it('does NOT show inline error if page is 1', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        hasMore={true}
        loadingMore={false}
        onLoadMore={vi.fn()}
        page={1}
        error="Test error"
        onRetry={vi.fn()}
      />
    );
    expect(screen.queryByText('Ocorreu um erro ao carregar mais produtos.')).toBeNull();
  });
});
