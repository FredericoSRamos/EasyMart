import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fc, test } from '@fast-check/vitest';
import ProductCard from '../../components/ProductCard';
import type { Product } from '../../services/api';
import { formatPrice } from '../../utils/formatPrice';

const priceString = fc
  .float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true })
  .map((n: number) => n.toFixed(2));

const productArbitrary = fc.record<Product>({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 60 }),
  price: priceString,
  promo_price: fc.constant(null),
  on_promo: fc.constant(false),
  market: fc.integer({ min: 1 }),
  market_slug: fc.constant('test-market'),
  categories: fc.array(fc.integer({ min: 1 })),
  categories_names: fc.array(fc.string({ minLength: 1, maxLength: 20 })),
  image_url: fc.oneof(fc.constant(''), fc.constant('https://example.com/img.jpg')),
  last_scraped_at: fc.constant('2024-01-01T00:00:00Z'),
});

const promoProductArbitrary = fc.record<Product>({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 60 }),
  price: fc
    .float({ min: Math.fround(2.0), max: Math.fround(9999.99), noNaN: true })
    .map((n: number) => n.toFixed(2)),
  promo_price: fc
    .float({ min: Math.fround(0.01), max: Math.fround(1.99), noNaN: true })
    .map((n: number) => n.toFixed(2)),
  on_promo: fc.constant(true),
  market: fc.integer({ min: 1 }),
  market_slug: fc.constant('test-market'),
  categories: fc.array(fc.integer({ min: 1 })),
  categories_names: fc.array(fc.string({ minLength: 1, maxLength: 20 })),
  image_url: fc.oneof(fc.constant(''), fc.constant('https://example.com/img.jpg')),
  last_scraped_at: fc.constant('2024-01-01T00:00:00Z'),
});

const marketNameArbitrary = fc.string({ minLength: 1, maxLength: 40 });

describe('ProductCard unit tests', () => {
  const baseProduct: Product = {
    id: 1,
    name: 'Arroz Integral 1kg',
    price: '5.99',
    promo_price: null,
    on_promo: false,
    market: 1,
    market_slug: 'supermercado-a',
    categories: [2],
    categories_names: ['Grãos'],
    image_url: '',
    last_scraped_at: '2024-01-01T00:00:00Z',
  };

  it('renders product name', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).toContain('Arroz Integral 1kg');
  });

  it('renders market name', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).toContain('Supermercado A');
  });

  it('renders regular price when promo_price is null', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).toContain(formatPrice(baseProduct.price));
    expect(container.querySelector('.line-through')).toBeNull();
  });

  it('renders promo price highlighted and original price with line-through when promo_price is set', () => {
    const promoProduct: Product = { ...baseProduct, promo_price: '4.49', on_promo: true };
    const { container } = render(
      <ProductCard product={promoProduct} marketName="Supermercado A" />
    );
    const struckEl = container.querySelector('.line-through');
    expect(struckEl).not.toBeNull();
    expect(struckEl!.textContent).toContain(formatPrice(promoProduct.price));
    // Promo price is rendered in green (text-green-400)
    const promoEls = Array.from(container.querySelectorAll('.text-green-400'));
    const promoPriceEl = promoEls.find((el) =>
      el.textContent?.includes(formatPrice(promoProduct.promo_price!))
    );
    expect(promoPriceEl).not.toBeUndefined();
  });

  it('does not render brand, or stock text', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).not.toMatch(/\bstock\b/i);
    expect(container.textContent).not.toContain('Sem marca');
  });

  it('renders image when image_url is provided and hides placeholder icon', () => {
    const productWithImg = { ...baseProduct, image_url: 'https://example.com/img.jpg' };
    const { container } = render(
      <ProductCard product={productWithImg} marketName="Supermercado A" />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toBe('https://example.com/img.jpg');
    
    // Icon should have display: none
    const svg = container.querySelector('svg');
    expect(svg?.style.display).toBe('none');
  });

  it('renders placeholder icon and no image when image_url is empty', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.querySelector('img')).toBeNull();
    
    const svg = container.querySelector('svg');
    expect(svg?.style.display).toBe('block');
  });

  it('always renders image placeholder (data-testid="image-placeholder")', () => {
    const { getByTestId } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(getByTestId('image-placeholder')).toBeTruthy();
  });

  it('renders discount badge when promo_price is set', () => {
    const promoProduct: Product = { ...baseProduct, promo_price: '4.49', on_promo: true };
    const { container } = render(
      <ProductCard product={promoProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).toMatch(/-\d+%/);
  });

  it('does NOT render discount badge when on_promo is false', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    expect(container.textContent).not.toMatch(/-\d+%/);
  });

  it('card body has minimum 1rem padding (px-5 class)', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    const card = container.querySelector('article');
    expect(card).not.toBeNull();
    const bodyDiv = card!.querySelector('.flex-col.flex-1');
    expect(bodyDiv).not.toBeNull();
    expect(bodyDiv!.className).toContain('px-5');
  });

  it('card body has gap between child elements (gap-2 class)', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    const card = container.querySelector('article');
    expect(card).not.toBeNull();
    const bodyDiv = card!.querySelector('.flex-col.flex-1');
    expect(bodyDiv).not.toBeNull();
    expect(bodyDiv!.className).toContain('gap-2');
  });

  it('card container has a visible border class (requirement 13.2)', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    const card = container.querySelector('article');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('border');
  });

  it('product name has font-semibold class for higher visual weight (requirement 13.3)', () => {
    const { container } = render(
      <ProductCard product={baseProduct} marketName="Supermercado A" />
    );
    const nameEl = Array.from(container.querySelectorAll('p')).find(
      (el) => el.textContent?.includes('Arroz Integral 1kg')
    );
    expect(nameEl).not.toBeNull();
    expect(nameEl!.className).toContain('font-semibold');
  });

  it('promo price has a distinct color class (text-green-400) different from regular price (requirement 13.4)', () => {
    const promoProduct: Product = { ...baseProduct, promo_price: '4.49', on_promo: true };
    const { container } = render(
      <ProductCard product={promoProduct} marketName="Supermercado A" />
    );
    const promoEls = Array.from(container.querySelectorAll('.text-green-400'));
    const promoPriceEl = promoEls.find((el) =>
      el.textContent?.includes(formatPrice(promoProduct.promo_price!))
    );
    expect(promoPriceEl).not.toBeUndefined();
    const struckEl = container.querySelector('.line-through');
    expect(struckEl).not.toBeNull();
    expect(struckEl!.className).not.toContain('text-green-400');
  });
});

describe('price display reflects promo state', () => {
  test.prop([promoProductArbitrary])(
    'renders strikethrough element with original price for any product with promo_price',
    (product: Product) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName="Test Market" />
      );
      const struckEl = container.querySelector('.line-through');
      expect(struckEl).not.toBeNull();
      expect(struckEl!.textContent).toContain(formatPrice(product.price));
      unmount();
    }
  );

  test.prop([productArbitrary])(
    'does not render strikethrough element when promo_price is null',
    (product: Product) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName="Test Market" />
      );
      expect(container.querySelector('.line-through')).toBeNull();
      unmount();
    }
  );
});

describe('renders required fields and omits removed fields', () => {
  test.prop([productArbitrary, marketNameArbitrary])(
    'renders market name for any product and market name',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      expect(container.textContent).toContain(marketName);
      unmount();
    }
  );

  test.prop([productArbitrary, marketNameArbitrary])(
    'does not render brand, or stock text for any product',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      expect(container.textContent).not.toMatch(/\bstock\b/i);
      expect(container.textContent).not.toContain('Sem marca');
      unmount();
    }
  );
});

describe('minimum spacing requirements', () => {
  test.prop([productArbitrary, marketNameArbitrary])(
    'card body has px-5 padding class for any product',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      const card = container.querySelector('article');
      expect(card).not.toBeNull();
      const bodyDiv = card!.querySelector('.flex-col.flex-1');
      expect(bodyDiv).not.toBeNull();
      expect(bodyDiv!.className).toContain('px-5');
      unmount();
    }
  );

  test.prop([productArbitrary, marketNameArbitrary])(
    'card body has gap-2 class for any product',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      const card = container.querySelector('article');
      expect(card).not.toBeNull();
      const bodyDiv = card!.querySelector('.flex-col.flex-1');
      expect(bodyDiv).not.toBeNull();
      expect(bodyDiv!.className).toContain('gap-2');
      unmount();
    }
  );
});

describe('image placeholder always renders', () => {
  test.prop([productArbitrary, marketNameArbitrary])(
    'image placeholder is always present for any product',
    (product: Product, marketName: string) => {
      const { getByTestId, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      expect(getByTestId('image-placeholder')).toBeTruthy();
      unmount();
    }
  );
});

describe('discount badge only on promotional products', () => {
  test.prop([promoProductArbitrary, marketNameArbitrary])(
    'renders discount badge for any product with promo_price set',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      expect(container.textContent).toMatch(/-\d+%/);
      unmount();
    }
  );

  test.prop([productArbitrary, marketNameArbitrary])(
    'does NOT render discount badge for any product with promo_price null',
    (product: Product, marketName: string) => {
      const { container, unmount } = render(
        <ProductCard product={product} marketName={marketName} />
      );
      expect(container.textContent).not.toMatch(/-\d+%/);
      unmount();
    }
  );
});
