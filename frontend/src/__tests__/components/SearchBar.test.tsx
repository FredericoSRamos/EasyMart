import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import SearchBar from '../../components/SearchBar';

describe('debounce triggers single setQuery call after pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls setQuery exactly once after 400ms pause, with the final value', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
        (keystrokes) => {
          const setQuery = vi.fn();
          const finalValue = keystrokes[keystrokes.length - 1];

          const { container, unmount } = render(
            <SearchBar query="" setQuery={setQuery} />
          );

          const input = container.querySelector('input') as HTMLInputElement;

          for (const value of keystrokes) {
            act(() => { vi.advanceTimersByTime(50); });
            fireEvent.change(input, { target: { value } });
          }

          expect(setQuery).not.toHaveBeenCalled();

          act(() => { vi.advanceTimersByTime(400); });

          expect(setQuery).toHaveBeenCalledTimes(1);
          expect(setQuery).toHaveBeenCalledWith(finalValue);

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('does NOT call setQuery once per keystroke (no intermediate calls before pause)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 8 }),
        (keystrokes) => {
          const setQuery = vi.fn();

          const { container, unmount } = render(
            <SearchBar query="" setQuery={setQuery} />
          );

          const input = container.querySelector('input') as HTMLInputElement;

          for (const value of keystrokes) {
            act(() => { vi.advanceTimersByTime(50); });
            fireEvent.change(input, { target: { value } });
          }

          expect(setQuery).not.toHaveBeenCalled();

          act(() => { vi.advanceTimersByTime(400); });
          expect(setQuery).toHaveBeenCalledTimes(1);

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('debounce fires exactly once after 400ms', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires setQuery exactly once after 400ms for any burst of keystrokes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        (keystrokes) => {
          const setQuery = vi.fn();
          const finalValue = keystrokes[keystrokes.length - 1];

          const { container, unmount } = render(
            <SearchBar query="" setQuery={setQuery} />
          );

          const input = container.querySelector('input') as HTMLInputElement;

          for (const value of keystrokes) {
            act(() => { vi.advanceTimersByTime(50); });
            fireEvent.change(input, { target: { value } });
          }

          expect(setQuery).not.toHaveBeenCalled();

          act(() => { vi.advanceTimersByTime(400); });

          expect(setQuery).toHaveBeenCalledTimes(1);
          expect(setQuery).toHaveBeenCalledWith(finalValue);

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('always enabled and correct placeholder', () => {
  it('input is never disabled and placeholder is always "Buscar produtos..."', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (query) => {
          const { container, unmount } = render(
            <SearchBar query={query} setQuery={vi.fn()} />
          );

          const input = container.querySelector('input') as HTMLInputElement;

          expect(input.disabled).toBe(false);
          expect(input.placeholder).toBe('Buscar produtos...');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('placeholder:text-text-muted and border-white/15', () => {
  it('sm variant input has placeholder:text-text-muted and border-white/15 classes', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="sm" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('placeholder:text-text-muted');
    expect(input.className).toContain('border-white/15');
  });

  it('lg variant input has placeholder:text-text-muted and border-white/15 classes', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="lg" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('placeholder:text-text-muted');
    expect(input.className).toContain('border-white/15');
  });
});

describe('input uses bg-bg-secondary in both size variants', () => {
  it('sm variant input has bg-bg-secondary class', () => {
    fc.assert(
      fc.property(fc.string(), (query) => {
        const { container, unmount } = render(
          <SearchBar query={query} setQuery={vi.fn()} size="sm" />
        );
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.className).toContain('bg-bg-secondary');
        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('lg variant input has bg-bg-secondary class', () => {
    fc.assert(
      fc.property(fc.string(), (query) => {
        const { container, unmount } = render(
          <SearchBar query={query} setQuery={vi.fn()} size="lg" />
        );
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.className).toContain('bg-bg-secondary');
        unmount();
      }),
      { numRuns: 10 }
    );
  });
});

describe('enter key triggers immediate setQuery call', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pressing Enter calls setQuery immediately without waiting for debounce', () => {
    const setQuery = vi.fn();
    const { container } = render(<SearchBar query="" setQuery={setQuery} />);
    const input = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'arroz' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setQuery).toHaveBeenCalledWith('arroz');
  });

  it('pressing Enter with empty input calls setQuery with empty string', () => {
    const setQuery = vi.fn();
    const { container } = render(<SearchBar query="" setQuery={setQuery} />);
    const input = container.querySelector('input') as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setQuery).toHaveBeenCalledWith('');
  });
});

describe('min-height class is applied (Requirements 17.4)', () => {
  it('sm variant input has min-h-[2.5rem] class', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="sm" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('min-h-[2.5rem]');
  });

  it('lg variant input has min-h-[2.5rem] class', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="lg" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('min-h-[2.5rem]');
  });
});

describe('search icon is rendered (Requirements 17.2)', () => {
  it('renders an svg search icon inside the search wrapper', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});

describe('focus ring class is applied (Requirements 17.3)', () => {
  it('sm variant input has focus:shadow class with accent color', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="sm" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('focus:shadow-[0_0_0_3px_rgba(59,130,246,0.3)]');
  });

  it('lg variant input has focus:shadow class with accent color', () => {
    const { container } = render(<SearchBar query="" setQuery={vi.fn()} size="lg" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('focus:shadow-[0_0_0_3px_rgba(59,130,246,0.3)]');
  });
});

describe('focus ring uses accent color', () => {
  it('for any size variant, input always has the accent focus-shadow class', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'sm' | 'lg'>('sm', 'lg'),
        fc.string(),
        (size, query) => {
          const { container, unmount } = render(
            <SearchBar query={query} setQuery={vi.fn()} size={size} />
          );
          const input = container.querySelector('input') as HTMLInputElement;
          expect(input.className).toContain('focus:shadow-[0_0_0_3px_rgba(59,130,246,0.3)]');
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});
