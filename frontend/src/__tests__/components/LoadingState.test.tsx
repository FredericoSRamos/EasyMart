import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import LoadingState from '../../components/LoadingState';

const variants = ['product-grid', 'market-grid', 'sidebar'] as const;

describe('skeleton elements always have shimmer class', () => {
  it('product-grid and market-grid variants have shimmer elements for any count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (count) => {
          const gridVariants = ['product-grid', 'market-grid'] as const;
          gridVariants.forEach((variant) => {
            const { container, unmount } = render(<LoadingState variant={variant} count={count} />);
            const shimmerEls = container.querySelectorAll('.shimmer');
            expect(shimmerEls.length).toBeGreaterThan(0);
            unmount();
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  it('sidebar variant has shimmer elements for any count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (count) => {
          const { container, unmount } = render(<LoadingState variant="sidebar" count={count} />);
          const shimmerEls = container.querySelectorAll('.shimmer');
          expect(shimmerEls.length).toBeGreaterThan(0);
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

describe('LoadingState', () => {
  it.each(variants)('%s: renders no <svg> spinner', (variant) => {
    const { container } = render(<LoadingState variant={variant} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it.each(variants)('%s: renders skeleton placeholder <div> elements', (variant) => {
    const { container } = render(<LoadingState variant={variant} />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it.each(variants)('%s: count prop controls number of skeleton items', (variant) => {
    const count = 4;
    const { container: c4 } = render(<LoadingState variant={variant} count={count} />);
    const { container: c2 } = render(<LoadingState variant={variant} count={2} />);

    const outerDiv4 = c4.querySelector('[aria-busy="true"]');
    const outerDiv2 = c2.querySelector('[aria-busy="true"]');

    expect(outerDiv4?.children.length).toBe(count);
    expect(outerDiv2?.children.length).toBe(2);
  });

  it.each(variants)('%s: container has aria-busy="true"', (variant) => {
    const { container } = render(<LoadingState variant={variant} />);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
  });

  it('product-grid: default count is 6', () => {
    const { container } = render(<LoadingState variant="product-grid" />);
    expect(container.querySelector('[aria-busy="true"]')?.children.length).toBe(6);
  });

  it('market-grid: default count is 3', () => {
    const { container } = render(<LoadingState variant="market-grid" />);
    expect(container.querySelector('[aria-busy="true"]')?.children.length).toBe(3);
  });

  it('sidebar: default count is 8', () => {
    const { container } = render(<LoadingState variant="sidebar" />);
    expect(container.querySelector('[aria-busy="true"]')?.children.length).toBe(8);
  });
});
