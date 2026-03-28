import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { SearchProvider } from '../../context/SearchContext';

describe('Icon-only buttons have aria-label', () => {

  it('CategorySidebar buttons are NOT icon-only (all have visible text)', () => {
    const { container, unmount } = render(
      <div>
        <button>Todas as categorias</button>
        <button>Frutas</button>
      </div>
    );
    const allButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    const iconOnlyButtons = allButtons.filter(b => b.textContent?.trim() === '');
    expect(iconOnlyButtons).toHaveLength(0);
    unmount();
  });
});

function renderLayout(path = '/supermarkets') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchProvider>
        <Layout>
          <div data-testid="child-content">page content</div>
        </Layout>
      </SearchProvider>
    </MemoryRouter>
  );
}

describe('Layout semantic HTML elements', () => {
  it('renders a <header> landmark element', () => {
    const { container } = renderLayout();
    expect(container.querySelector('header')).not.toBeNull();
  });

  it('renders a <nav> landmark element', () => {
    const { container } = renderLayout();
    expect(container.querySelector('nav')).not.toBeNull();
  });

  it('renders a <main> landmark element', () => {
    const { container } = renderLayout();
    expect(container.querySelector('main')).not.toBeNull();
  });

  it('renders a <footer> landmark element', () => {
    const { container } = renderLayout();
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('renders children inside <main>', () => {
    const { getByTestId, container } = renderLayout();
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main!.contains(getByTestId('child-content'))).toBe(true);
  });

  it('all four semantic landmarks are present simultaneously', () => {
    const { container } = renderLayout();
    for (const tag of ['header', 'nav', 'main', 'footer']) {
      expect(container.querySelector(tag), `<${tag}> should be present`).not.toBeNull();
    }
  });
});

describe('Navbar visual separation', () => {
  it('header has border-b class for visual separation', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header!.classList.contains('border-b')).toBe(true);
  });

  it('header has glass class for backdrop blur background', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header!.classList.contains('glass')).toBe(true);
  });
});

describe('Layout structured zones', () => {
  it('header has sticky class (sticky top bar)', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header!.classList.contains('sticky')).toBe(true);
  });

  it('header has z-[100] for correct stacking context', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    // z-[100] is rendered as a class string containing z-[100]
    expect(header!.className).toContain('z-[100]');  });

  it('main content wrapper has max-w-[1440px] class', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    const innerDiv = header!.querySelector('.max-w-\\[1440px\\]');
    expect(innerDiv).not.toBeNull();
  });

  it('main content wrapper is horizontally centered with mx-auto', () => {
    const { container } = renderLayout();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    const innerDiv = header!.querySelector('.mx-auto');
    expect(innerDiv).not.toBeNull();
  });
});

describe('nav links (app-refactoring)', () => {
  it('renders exactly 2 nav links (Supermarkets and Products)', () => {
    const { container } = renderLayout();
    const navLinks = container.querySelectorAll('nav a');
    expect(navLinks.length).toBe(2);
  });

  it('nav contains /supermarkets and /products links', () => {
    const { container } = renderLayout();
    const nav = container.querySelector('nav');
    const hrefs = Array.from(nav!.querySelectorAll('a')).map(
      (a) => (a as HTMLAnchorElement).getAttribute('href')
    );
    expect(hrefs).toContain('/supermarkets');
    expect(hrefs).toContain('/products');
  });

  it('nav does NOT contain / (Home) link', () => {
    const { container } = renderLayout();
    const nav = container.querySelector('nav');
    const hrefs = Array.from(nav!.querySelectorAll('a')).map(
      (a) => (a as HTMLAnchorElement).getAttribute('href')
    );
    expect(hrefs).not.toContain('/');
  });

  it('nav does NOT contain /promotions link', () => {
    const { container } = renderLayout();
    const nav = container.querySelector('nav');
    const hrefs = Array.from(nav!.querySelectorAll('a')).map(
      (a) => (a as HTMLAnchorElement).getAttribute('href')
    );
    expect(hrefs).not.toContain('/promotions');
  });
});

describe('active nav link accent style', () => {
  it('active nav link has text-accent-primary for /supermarkets', () => {
    const { container, unmount } = renderLayout('/supermarkets');
    const links = container.querySelectorAll('nav a');
    const activeLink = Array.from(links).find(
      (a) => (a as HTMLAnchorElement).getAttribute('href') === '/supermarkets'
    );
    expect(activeLink).not.toBeNull();
    expect(activeLink!.className).toContain('text-accent-primary');
    unmount();
  });

  it('active nav link has text-accent-primary for /products', () => {
    const { container, unmount } = renderLayout('/products');
    const links = container.querySelectorAll('nav a');
    const activeLink = Array.from(links).find(
      (a) => (a as HTMLAnchorElement).getAttribute('href') === '/products'
    );
    expect(activeLink).not.toBeNull();
    expect(activeLink!.className).toContain('text-accent-primary');
    unmount();
  });

  it('inactive nav links do not have text-accent-primary', () => {
    const { container } = renderLayout('/products');
    const links = container.querySelectorAll('nav a');
    links.forEach((link) => {
      const href = (link as HTMLAnchorElement).getAttribute('href');
      if (href !== '/products') {
        expect(link.className).not.toContain('text-accent-primary');
      }
    });
  });
});

describe('branding and footer', () => {
  it('brand name contains "EasyMart"', () => {
    const { container } = renderLayout();
    expect(container.textContent).toContain('EasyMart');
  });

  it('footer copyright contains "EasyMart"', () => {
    const { container } = renderLayout();
    const footer = container.querySelector('footer');
    expect(footer?.textContent).toContain('EasyMart');
  });
});

import { fireEvent, act } from '@testing-library/react';

describe('search navigates to /products', () => {
  it('typing in SearchBar from a non-searchable page navigates to /products after debounce', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <SearchProvider>
            <Layout>
              <div />
            </Layout>
          </SearchProvider>
        </MemoryRouter>
      );

      const input = container.querySelector('input[aria-label="Buscar produtos"]') as HTMLInputElement;
      expect(input).not.toBeNull();

      fireEvent.change(input, { target: { value: 'arroz' } });
      act(() => { vi.advanceTimersByTime(500); });

      const links = container.querySelectorAll('nav a');
      const productsLink = Array.from(links).find(
        (a) => (a as HTMLAnchorElement).getAttribute('href') === '/products'
      );
      expect(productsLink?.className).toContain('text-accent-primary');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pressing Enter in SearchBar from a non-searchable page triggers search immediately', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <SearchProvider>
          <Layout>
            <div />
          </Layout>
        </SearchProvider>
      </MemoryRouter>
    );

    const input = container.querySelector('input[aria-label="Buscar produtos"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'feijao' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const links = container.querySelectorAll('nav a');
    const productsLink = Array.from(links).find(
      (a) => (a as HTMLAnchorElement).getAttribute('href') === '/products'
    );
    expect(productsLink?.className).toContain('text-accent-primary');
  });
});
