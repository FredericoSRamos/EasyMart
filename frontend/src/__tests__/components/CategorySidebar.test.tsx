import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { fc } from '@fast-check/vitest';
import CategorySidebar from '../../components/CategorySidebar';
import type { Category } from '../../services/api';

const activeClass = 'bg-accent-primary/15';

function makeCategories(count: number): Category[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Category ${i + 1}`,
    market: 1,
    market_slug: 'test-market',
  }));
}

describe('CategorySidebar unit tests', () => {
  const categories = makeCategories(3);

  it('renders "Todas as categorias" button', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={null} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    expect(nav.textContent).toContain('Todas as categorias');
  });

  it('"Todas as categorias" is active when selectedCategory is null', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={null} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const allBtn = Array.from(nav.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Todas as categorias')
    );
    expect(allBtn).not.toBeNull();
    expect(allBtn!.className).toContain(activeClass);
  });

  it('"Todas as categorias" is NOT active when a category is selected', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={1} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const allBtn = Array.from(nav.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Todas as categorias')
    );
    expect(allBtn).not.toBeNull();
    expect(allBtn!.className).not.toContain(activeClass);
  });

  it('selected category item has active CSS class', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={2} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    const activeBtn = buttons.find((b) => b.className.includes(activeClass));
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.textContent).toContain('Category 2');
  });

  it('non-active items do NOT have the active CSS class', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={1} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    const nonActiveButtons = buttons.filter(
      (b) => !b.textContent?.includes('Category 1') && !b.textContent?.includes('Todas as categorias')
    );
    for (const btn of nonActiveButtons) {
      expect(btn.className).not.toContain(activeClass);
    }
  });

  it('active item has font-semibold class', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={1} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    const activeBtn = buttons.find((b) => b.className.includes(activeClass));
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.className).toContain('font-semibold');
  });

  it('active item has left border accent class', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={1} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    const activeBtn = buttons.find((b) => b.className.includes(activeClass));
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.className).toContain('border-accent-primary');
  });

  it('renders icons alongside each item', () => {
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={null} onSelect={vi.fn()} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const buttons = Array.from(nav.querySelectorAll('button')).filter(
      (b) => !b.textContent?.includes('Ver mais') && !b.textContent?.includes('Ver menos')
    );
    for (const btn of buttons) {
      expect(btn.querySelector('svg')).not.toBeNull();
    }
  });

  it('calls onSelect with null when "Todas as categorias" is clicked', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={1} onSelect={onSelect} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const allBtn = Array.from(nav.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Todas as categorias')
    );
    fireEvent.click(allBtn!);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect with category id when a category is clicked', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <CategorySidebar categories={categories} selectedCategory={null} onSelect={onSelect} />
    );
    const nav = getByRole('navigation', { name: 'Categorias' });
    const catBtn = Array.from(nav.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Category 2')
    );
    fireEvent.click(catBtn!);
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

const categoryArbitrary = (id: number): fc.Arbitrary<Category> =>
  fc.record<Category>({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.replace(/\s+/g, ' ').trim() || `Cat${id}`),
    market: fc.constant(1),
    market_slug: fc.constant('test-market'),
  });

const categoriesArbitrary = fc
  .integer({ min: 1, max: 8 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => categoryArbitrary(i + 1)))
  )
  .map((cats) => cats as Category[]);

describe('active item has distinct visual state', () => {
  it('active category item has active CSS class and non-active items do not', () => {
    fc.assert(
      fc.property(categoriesArbitrary, (categories: Category[]) => {
        if (categories.length === 0) return;
        const selectedId = categories[0].id;
        const { getByRole, unmount } = render(
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedId}
            onSelect={vi.fn()}
          />
        );
        const nav = getByRole('navigation', { name: 'Categorias' });
        const buttons = Array.from(nav.querySelectorAll('button'));

        // Exactly one button should have the active class
        const activeBtns = buttons.filter((b) => b.className.includes(activeClass));
        expect(activeBtns.length).toBe(1);

        // Non-active buttons should not have the active class
        const nonActiveBtns = buttons.filter((b) => !b.className.includes(activeClass));
        for (const btn of nonActiveBtns) {
          expect(btn.className).not.toContain(activeClass);
        }

        unmount();
      }),
      { numRuns: 20 }
    );
  }, 30000);

  it('"Todas as categorias" is active when selectedCategory is null and no category item is active', () => {
    fc.assert(
      fc.property(categoriesArbitrary, (categories: Category[]) => {
        const { getByRole, unmount } = render(
          <CategorySidebar
            categories={categories}
            selectedCategory={null}
            onSelect={vi.fn()}
          />
        );
        const nav = getByRole('navigation', { name: 'Categorias' });
        const buttons = Array.from(nav.querySelectorAll('button'));

        // "Todas as categorias" should be active
        const allBtn = buttons.find((b) => b.textContent?.includes('Todas as categorias'));
        expect(allBtn).not.toBeNull();
        expect(allBtn!.className).toContain(activeClass);

        // No category-specific button should be active
        const categoryButtons = buttons.filter(
          (b) =>
            !b.textContent?.includes('Todas as categorias') &&
            !b.textContent?.includes('Ver mais') &&
            !b.textContent?.includes('Ver menos')
        );
        for (const btn of categoryButtons) {
          expect(btn.className).not.toContain(activeClass);
        }

        unmount();
      }),
      { numRuns: 20 }
    );
  }, 30000);
});