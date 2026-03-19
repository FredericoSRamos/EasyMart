import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const delta = 2;
  const left = currentPage - delta;
  const right = currentPage + delta;

  if (left > 1) pages.push(1);
  if (left > 2) pages.push('...');

  for (let i = Math.max(1, left); i <= Math.min(totalPages, right); i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) pages.push('...');
  if (right < totalPages) pages.push(totalPages);

  return pages;
}

const baseBtn =
  'flex items-center justify-center w-9 h-9 rounded-md border border-border bg-bg-secondary text-text-primary text-sm font-medium transition-colors hover:bg-bg-tertiary hover:border-accent-primary hover:text-accent-secondary disabled:opacity-35 disabled:cursor-not-allowed';
const activeBtn = 'bg-accent-primary border-accent-primary text-white font-semibold';

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-2 py-6 flex-wrap" aria-label="Navegação de páginas">
      <button
        className={baseBtn}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex items-center justify-center w-9 h-9 text-text-muted text-sm select-none"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            className={`${baseBtn}${page === currentPage ? ` ${activeBtn}` : ''}`}
            onClick={() => onPageChange(page)}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        className={baseBtn}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} />
      </button>

      <span className="pagination-label text-sm text-text-secondary mx-3">
        Página {currentPage} de {totalPages}
      </span>
    </nav>
  );
}
