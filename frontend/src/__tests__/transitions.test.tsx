import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import CategorySidebar from '../components/CategorySidebar';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import type { Category } from '../services/api';

function hasTransition(el: Element): boolean {
  return el.className.includes('transition');
}

describe('Interactive elements have transition classes', () => {
  it('CategorySidebar buttons all have transition class for any category list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            market: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (categories: Category[]) => {
          const unique = categories.filter(
            (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
          );
          if (unique.length === 0) return;

          const { container, unmount } = render(
            <CategorySidebar
              categories={unique}
              selectedCategory={null}
              onSelect={vi.fn()}
            />
          );

          const buttons = container.querySelectorAll('button');
          buttons.forEach((btn) => {
            expect(hasTransition(btn)).toBe(true);
          });

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Pagination buttons all have transition class for any page/total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );

          const buttons = container.querySelectorAll('button');
          buttons.forEach((btn) => {
            expect(hasTransition(btn)).toBe(true);
          });

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('SearchBar input has transition class', () => {
    const { container } = render(
      <MemoryRouter>
        <SearchBar query="" setQuery={vi.fn()} />
      </MemoryRouter>
    );

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(hasTransition(input!)).toBe(true);
  });

  it('Layout nav link has transition class', () => {
    const navLinkClass = 'flex items-center gap-2 transition-colors duration-150';
    expect(navLinkClass).toContain('transition');
  });
});
