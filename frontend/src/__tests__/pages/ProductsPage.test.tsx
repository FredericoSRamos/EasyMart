import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fc, test as fcTest } from '@fast-check/vitest';
import * as api from '../../services/api';
import { SearchProvider } from '../../context/SearchContext';
import ProductsPage from '../../pages/ProductsPage';

function makeMarket(id: number): api.Market {
  return { id, name: `Market ${id}`, slug: `market-${id}`, domain: `market${id}.com` };
}

function makeProduct(id: number, marketSlug: string): api.Product {
  return {
    id,
    name: `Product ${id}`,
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
  vi.spyOn(api.marketService, 'getMarkets').mockResolvedValue({
    data: { count: markets.length, next: null, previous: null, results: markets },
  } as any);
}

function mockProducts(products: api.Product[]) {
  vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
    data: { count: products.length, next: null, previous: null, results: products },
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchProvider>
        <ProductsPage />
      </SearchProvider>
    </MemoryRouter>
  );
}

let mockIntersect: (entries: any[]) => void = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api.marketService, 'getMarkets').mockResolvedValue({ data: emptyPaginated } as any);
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

describe('ProductsPage unit tests', () => {
  it('fetches products with no market_ids param by default', async () => {
    const getProductsSpy = vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
      data: emptyPaginated,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(getProductsSpy).toHaveBeenCalled();
      const firstCall = getProductsSpy.mock.calls[0][0];
      expect(firstCall.market_ids).toBeUndefined();
    });
  });

  it('selecting markets calls API with correct market_ids', async () => {
    const markets = [makeMarket(1), makeMarket(2)];
    mockMarkets(markets);
    const getProductsSpy = vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
      data: emptyPaginated,
    } as any);

    renderPage();

    await waitFor(() => screen.getByText('Market 1'));

    fireEvent.click(screen.getByText('Market 1'));

    await waitFor(() => {
      const calls = getProductsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.market_ids).toEqual([1]);
    });
  });

  it('deselecting all markets reverts to showing all products (no market_ids)', async () => {
    const markets = [makeMarket(1)];
    mockMarkets(markets);
    const getProductsSpy = vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
      data: emptyPaginated,
    } as any);

    renderPage();

    await waitFor(() => screen.getByText('Market 1'));

    fireEvent.click(screen.getByText('Market 1'));
    fireEvent.click(screen.getByText('Market 1'));

    await waitFor(() => {
      const calls = getProductsSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.market_ids).toBeUndefined();
    });
  });

  it('shows EmptyState when no products returned', async () => {
    mockMarkets([]);
    mockProducts([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto encontrado.')).toBeTruthy();
    });
  });

  it('shows ErrorState on fetch failure', async () => {
    vi.spyOn(api.marketService, 'getMarkets').mockResolvedValue({ data: emptyPaginated } as any);
    vi.spyOn(api.productService, 'getProducts').mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nao foi possivel carregar os produtos.')).toBeTruthy();
    });
  });

  it('renders sort options as buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Menor preco')).toBeTruthy();
    });
  });

  it('renders product names when products are returned', async () => {
    const markets = [makeMarket(1)];
    mockMarkets(markets);
    mockProducts([makeProduct(1, 'market-1'), makeProduct(2, 'market-1')]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeTruthy();
      expect(screen.getByText('Product 2')).toBeTruthy();
    });
  });

  it('accumulates products on scroll', async () => {
    const p1 = makeProduct(1, 'market-1');
    const p2 = makeProduct(2, 'market-1');
    
    const getProductsSpy = vi.spyOn(api.productService, 'getProducts');
    // Page 1
    getProductsSpy.mockResolvedValueOnce({
      data: { count: 2, next: 'page=2', previous: null, results: [p1] }
    } as any);
    // Page 2
    getProductsSpy.mockResolvedValueOnce({
      data: { count: 2, next: null, previous: 'page=1', results: [p2] }
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeTruthy();
    });

    // Trigger scroll
    mockIntersect([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeTruthy();
      expect(screen.getByText('Product 2')).toBeTruthy();
    });
  });
});

describe('market filter scopes results', () => {
  fcTest.prop(
    [
      fc
        .array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 })
        .map((ids) => [...new Set(ids)])
        .filter((ids) => ids.length > 0)
        .map((ids) => ids.map((id) => makeMarket(id))),
    ],
    { numRuns: 20 }
  )(
    'selecting any non-empty subset of markets calls getProducts with those market_ids',
    async (markets) => {
      vi.restoreAllMocks();
      mockMarkets(markets);
      const getProductsSpy = vi.spyOn(api.productService, 'getProducts').mockResolvedValue({
        data: emptyPaginated,
      } as any);

      const { container, unmount } = renderPage();
      const scope = within(container);

      await waitFor(() => {
        expect(scope.getByText(markets[0].name)).toBeTruthy();
      });

      fireEvent.click(scope.getByText(markets[0].name));

      await waitFor(() => {
        const calls = getProductsSpy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.market_ids).toBeDefined();
        expect(lastCall.market_ids).toContain(markets[0].id);
      });

      unmount();
    }
  );
});
