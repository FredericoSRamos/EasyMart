import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import EmptyState from '../../components/EmptyState';

const labelString = fc
  .base64String({ minLength: 4, maxLength: 24 })
  .map((s) => s.replace(/=/g, 'x'));

describe('EmptyState', () => {
  it('renders message text for any visible string input', () => {
    fc.assert(
      fc.property(labelString, (message) => {
        const { container, unmount } = render(<EmptyState message={message} />);
        const p = container.querySelector('p');
        expect(p?.textContent?.trim()).toBe(message);
        unmount();
      })
    );
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    fc.assert(
      fc.property(labelString, labelString, (message, actionLabel) => {
        const onAction = vi.fn();
        const { container, unmount } = render(
          <EmptyState message={message} actionLabel={actionLabel} onAction={onAction} />
        );
        const button = container.querySelector('button');
        expect(button).not.toBeNull();
        expect(button?.textContent?.trim()).toBe(actionLabel);
        unmount();
      })
    );
  });

  it('does not render action button when actionLabel is omitted', () => {
    fc.assert(
      fc.property(labelString, (message) => {
        const { container, unmount } = render(<EmptyState message={message} />);
        expect(container.querySelector('button')).toBeNull();
        unmount();
      })
    );
  });

  it('action button invokes onAction callback when clicked', () => {
    fc.assert(
      fc.property(labelString, labelString, (message, actionLabel) => {
        const onAction = vi.fn();
        const { container, unmount } = render(
          <EmptyState message={message} actionLabel={actionLabel} onAction={onAction} />
        );
        const button = container.querySelector('button') as HTMLElement;
        fireEvent.click(button);
        expect(onAction).toHaveBeenCalledOnce();
        unmount();
      }),
      { numRuns: 25 }
    );
  });
});

describe('query text and Limpar busca', () => {
  it('shows query text and "Limpar busca" button when queryText and onClearSearch are provided', () => {
    const onClearSearch = vi.fn();
    const { getByText } = render(
      <EmptyState message="Nenhum resultado" queryText="arroz" onClearSearch={onClearSearch} />
    );
    expect(getByText('arroz')).toBeInTheDocument();
    const btn = getByText('Limpar busca');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onClearSearch).toHaveBeenCalledOnce();
  });

  it('does not show "Limpar busca" when queryText is absent', () => {
    const { queryByText } = render(
      <EmptyState message="Nenhum resultado" onClearSearch={vi.fn()} />
    );
    expect(queryByText('Limpar busca')).toBeNull();
  });

  it('shows query text for any non-empty string', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (queryText) => {
          const { container, unmount } = render(
            <EmptyState message="Nenhum resultado" queryText={queryText} onClearSearch={() => {}} />
          );
          expect(container.textContent).toContain(queryText);
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Limpar filtros', () => {
  it('shows "Limpar filtros" button when onClearFilters is provided', () => {
    const onClearFilters = vi.fn();
    const { getByText } = render(
      <EmptyState message="Nenhum resultado" onClearFilters={onClearFilters} />
    );
    const btn = getByText('Limpar filtros');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('does not show "Limpar filtros" when onClearFilters is absent', () => {
    const { queryByText } = render(
      <EmptyState message="Nenhum resultado" />
    );
    expect(queryByText('Limpar filtros')).toBeNull();
  });
});

describe('no skeleton cards', () => {
  it('never renders shimmer or skeleton elements', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        (message, queryText) => {
          const { container, unmount } = render(
            <EmptyState message={message} queryText={queryText} onClearSearch={() => {}} onClearFilters={() => {}} />
          );
          expect(container.querySelector('.shimmer')).toBeNull();
          expect(container.querySelector('[aria-busy]')).toBeNull();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('icon, heading, onReset', () => {
  it('renders a default svg icon even when no icon prop is passed', () => {
    const { container } = render(<EmptyState message="Nenhum produto encontrado." />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an h3 heading element', () => {
    const { container } = render(<EmptyState message="Nenhum produto encontrado." />);
    const h3 = container.querySelector('h3');
    expect(h3).not.toBeNull();
    expect(h3?.textContent?.trim()).toBeTruthy();
  });

  it('renders a custom heading when heading prop is provided', () => {
    const { container } = render(
      <EmptyState message="msg" heading="Título personalizado" />
    );
    expect(container.querySelector('h3')?.textContent?.trim()).toBe('Título personalizado');
  });

  it('renders onReset button when onReset prop is provided', () => {
    const onReset = vi.fn();
    const { container } = render(
      <EmptyState message="Nenhum produto encontrado." onReset={onReset} />
    );
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent?.trim()).toBe('Limpar tudo');
  });

  it('does not render onReset button when onReset prop is absent', () => {
    const { container } = render(<EmptyState message="Nenhum produto encontrado." />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('clicking onReset button calls the callback', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    const { container, unmount } = render(<EmptyState message="Nenhum produto encontrado." onReset={onReset} />);
    const button = container.querySelector('button') as HTMLElement;
    await user.click(button);
    expect(onReset).toHaveBeenCalledOnce();
    unmount();
  });

  it('for any message, empty state with onReset renders a button that calls onReset on click', () => {
    fc.assert(
      fc.property(labelString, (message) => {
        const onReset = vi.fn();
        const { container, unmount } = render(<EmptyState message={message} onReset={onReset} />);
        const button = container.querySelector('button') as HTMLElement;
        expect(button).not.toBeNull();
        fireEvent.click(button);
        expect(onReset).toHaveBeenCalledOnce();
        unmount();
      }),
      { numRuns: 20 }
    );
  });
});
