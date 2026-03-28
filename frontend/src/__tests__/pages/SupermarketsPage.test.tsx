import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../../services/api';
import { SearchProvider } from '../../context/SearchContext';
import SupermarketsPage from '../../pages/SupermarketsPage';

function makeMarket(id: number, name: string, slug: string): api.Market {
  return { id, name, slug, domain: `${slug}.com` };
}

function makeProduct(id: number, name: string, marketSlug: string): api.Product {
  return {
    id,
    name,
    price: '10.00',
    promo_price: null,
    on_promo: false,
    market: 1,
    market_slug: marketSlug,
    categories: [],
    categories_names: [],
    last_scraped_at: '2024-01-01T00:00:00Z',
  };
}

const emptyPaginated = { count: 0, next: null, previous: null, results: [] };

function mockMarkets(markets: api.Market[]) {
  return vi.spyOn(api.marketService, 'getMarkets').mockResolvedValue({
    data: { count: markets.length, next: null, previous: null, results: markets },
  } as any);
}

function mockProducts(products: api.Product[], next: string | null = null) {
  return vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
    data: { count: products.length, next, previous: null, results: products },
  } as any);
}

let mockIntersect: (entries: any[]) => void = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchProvider>
        <SupermarketsPage />
      </SearchProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api.marketService, 'getMarkets').mockResolvedValue({ data: emptyPaginated } as any);
  vi.spyOn(api.categoryService, 'getCategories').mockResolvedValue({ data: emptyPaginated } as any);
  vi.spyOn(api.productService, 'getProducts').mockResolvedValue({ data: emptyPaginated } as any);

  // Mock IntersectionObserver
  window.IntersectionObserver = vi.fn().mockImplementation(function (callback: any) {
    mockIntersect = callback;
    return {
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    };
  }) as any;
  window.HTMLElement.prototype.scrollTo = vi.fn();
});

describe('SupermarketsPage functionality', () => {
  it('renders market buttons', async () => {
    mockMarkets([makeMarket(1, 'Market A', 'market-a'), makeMarket(2, 'Market B', 'market-b')]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Market A')).toBeTruthy();
      expect(screen.getByText('Market B')).toBeTruthy();
    });
  });

  it('shows empty prompt before selecting a market', async () => {
    mockMarkets([makeMarket(1, 'Market A', 'market-a')]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Selecione um mercado para ver os produtos')).toBeTruthy();
    });
  });

  it('selecting a market loads products', async () => {
    mockMarkets([makeMarket(1, 'Market A', 'market-a')]);
    const getProductsSpy = mockProducts([makeProduct(1, 'Prod 1', 'market-a')]);
    renderPage();

    await waitFor(() => screen.getByText('Market A'));
    fireEvent.click(screen.getByText('Market A'));

    await waitFor(() => {
      expect(getProductsSpy).toHaveBeenCalled();
      const callArgs = getProductsSpy.mock.calls[0][0];
      expect(callArgs.market_slug).toBe('market-a');
      expect(screen.getByText('Prod 1')).toBeTruthy();
    });
  });

  it('accumulates products on scroll (Infinite Scroll)', async () => {
    mockMarkets([makeMarket(1, 'Market A', 'market-a')]);
    const p1 = makeProduct(1, 'Product Page 1', 'market-a');
    const p2 = makeProduct(2, 'Product Page 2', 'market-a');

    const getProductsSpy = vi.spyOn(api.productService, 'getProducts');
    // Page 1
    getProductsSpy.mockResolvedValueOnce({
      data: { count: 2, next: 'page=2', previous: null, results: [p1] }
    } as any);

    renderPage();

    await waitFor(() => screen.getByText('Market A'));
    fireEvent.click(screen.getByText('Market A'));

    await waitFor(() => {
      expect(screen.getByText('Product Page 1')).toBeTruthy();
    });

    // Page 2
    getProductsSpy.mockResolvedValueOnce({
      data: { count: 2, next: null, previous: 'page=1', results: [p2] }
    } as any);

    // Trigger scroll
    mockIntersect([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByText('Product Page 1')).toBeTruthy();
      expect(screen.getByText('Product Page 2')).toBeTruthy();
      // Should have been called twice, second time with page: 2
      const secondCall = getProductsSpy.mock.calls[1][0];
      expect(secondCall.page).toBe(2);
    });
  });
});
