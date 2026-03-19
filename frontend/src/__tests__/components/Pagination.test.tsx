import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 20;

function shouldShowPagination(totalCount: number, pageSize: number): boolean {
  return Math.ceil(totalCount / pageSize) > 1;
}

describe('label is correct for any page/total', () => {
  it('renders "Pagina X de Y" text for any valid currentPage / totalPages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );
          const label = container.querySelector('.pagination-label');
          expect(label?.textContent).toContain(String(currentPage));
          expect(label?.textContent).toContain(String(totalPages));
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('boundary buttons disabled at edges', () => {
  it('previous button is disabled when currentPage === 1', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        (totalPages) => {
          const { container, unmount } = render(
            <Pagination currentPage={1} totalPages={totalPages} onPageChange={vi.fn()} />
          );
          const prevBtn = container.querySelector('button[aria-label="Página anterior"]') as HTMLButtonElement;
          expect(prevBtn).not.toBeNull();
          expect(prevBtn.disabled).toBe(true);
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('next button is disabled when currentPage === totalPages', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        (totalPages) => {
          const { container, unmount } = render(
            <Pagination currentPage={totalPages} totalPages={totalPages} onPageChange={vi.fn()} />
          );
          const nextBtn = container.querySelector('button[aria-label="Próxima página"]') as HTMLButtonElement;
          expect(nextBtn).not.toBeNull();
          expect(nextBtn.disabled).toBe(true);
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('previous button is enabled when currentPage > 1', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 50 }),
        fc.integer({ min: 2, max: 50 }),
        (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );
          const prevBtn = container.querySelector('button[aria-label="Página anterior"]') as HTMLButtonElement;
          expect(prevBtn).not.toBeNull();
          expect(prevBtn.disabled).toBe(false);
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

describe('active page button uses accent-primary', () => {
  it('active page button has bg-accent-primary; others do not', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );

          const pageButtons = Array.from(
            container.querySelectorAll('button[aria-label^="Página "]')
          ) as HTMLButtonElement[];

          pageButtons.forEach((btn) => {
            const pageNum = parseInt(btn.getAttribute('aria-label')!.replace('Página ', ''), 10);
            if (pageNum === currentPage) {
              expect(btn.className).toContain('bg-accent-primary');
            } else {
              expect(btn.className).not.toContain('bg-accent-primary');
            }
          });

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

describe('accessibility attributes are always correct', () => {
  it('nav has aria-label and active button has aria-current="page"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );

          const nav = container.querySelector('nav');
          expect(nav).not.toBeNull();
          expect(nav!.getAttribute('aria-label')).toBeTruthy();

          const currentBtn = container.querySelector('button[aria-current="page"]');
          expect(currentBtn).not.toBeNull();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

describe('renders ellipsis for large page sets', () => {
  it('renders at least one ellipsis when totalPages >= 8 and currentPage is in the middle', () => {
    fc.assert(
      fc.property(
        // With delta = 2, need totalPages >= 8 so that a middle page leaves gaps on both sides
        fc.integer({ min: 8, max: 50 }),
        (totalPages) => {
          const currentPage = Math.floor(totalPages / 2);
          const { container, unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />
          );

          const ellipsisSpans = Array.from(container.querySelectorAll('span')).filter(
            (s) => s.textContent?.includes('…')
          );
          expect(ellipsisSpans.length).toBeGreaterThan(0);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

describe('renders only when needed (legacy)', () => {
  it('does NOT render when totalCount fits on a single page', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PAGE_SIZE }),
        (totalCount) => {
          const totalPages = Math.ceil(totalCount / PAGE_SIZE);
          expect(shouldShowPagination(totalCount, PAGE_SIZE)).toBe(false);

          const { container, unmount } = render(
            totalPages > 1 ? (
              <Pagination currentPage={1} totalPages={totalPages} onPageChange={vi.fn()} />
            ) : (
              <div data-testid="no-pagination" />
            )
          );

          expect(container.querySelector('nav[aria-label]')).toBeNull();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('DOES render when totalCount exceeds a single page', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: PAGE_SIZE + 1, max: PAGE_SIZE * 20 }),
        (totalCount) => {
          const totalPages = Math.ceil(totalCount / PAGE_SIZE);
          expect(shouldShowPagination(totalCount, PAGE_SIZE)).toBe(true);

          const { container, unmount } = render(
            totalPages > 1 ? (
              <Pagination currentPage={1} totalPages={totalPages} onPageChange={vi.fn()} />
            ) : (
              <div data-testid="no-pagination" />
            )
          );

          expect(container.querySelector('nav[aria-label]')).not.toBeNull();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('page click triggers correct callback (legacy)', () => {
  it('calls onPageChange with the clicked page number', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (totalPages, rawPage) => {
          const currentPage = Math.min(rawPage, totalPages);
          const onPageChange = vi.fn();
          const user = userEvent.setup();

          const { unmount } = render(
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          );

          const targetPage = currentPage === totalPages ? 1 : totalPages;
          const btn = screen.getByRole('button', { name: `Página ${targetPage}` });
          await user.click(btn);

          expect(onPageChange).toHaveBeenCalledWith(targetPage);
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});
