import { LayoutGrid } from 'lucide-react';
import type { Category } from '../services/api';
import { getCategoryIcon } from '../utils/categoryIcon';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: number | null;
  onSelect: (id: number | null) => void;
}

function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const activeClass =
  'w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg transition-all ' +
  'bg-accent-primary/15 text-accent-primary border-l-2 border-accent-primary';
const inactiveClass =
  'w-full text-left px-3 py-2.5 text-sm text-text-secondary rounded-lg transition-all border-l-2 border-transparent ' +
  'hover:bg-white/8 hover:text-text-primary hover:border-white/20';

export default function CategorySidebar({ categories, selectedCategory, onSelect }: CategorySidebarProps) {
  const seen = new Set<string>();
  const deduped = categories.filter((cat) => {
    const key = toSentenceCase(cat.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <nav className="flex flex-col h-full" aria-label="Categorias">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="text-[0.65rem] font-semibold text-text-muted uppercase tracking-widest px-1 mb-2">
          Categorias
        </p>
        <button
          className={selectedCategory === null ? activeClass : inactiveClass}
          onClick={() => onSelect(null)}
        >
          <span className="flex items-center gap-2">
            <LayoutGrid size={14} />
            Todas as categorias
          </span>
        </button>
        <hr className="border-border/40 mt-2" />
      </div>

      <div className="flex-1 overflow-y-auto categories px-3 pb-3 flex flex-col gap-0.5">
        {deduped.length === 0 ? (
          <p className="text-xs text-text-muted px-1 py-4 text-center">
            {categories.length === 0 ? 'Selecione um mercado' : 'Sem categorias'}
          </p>
        ) : (
          deduped.map((cat) => {
            const { Icon, color } = getCategoryIcon(cat.name);
            return (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? activeClass : inactiveClass}
                onClick={() => onSelect(cat.id)}
              >
                <span className="flex items-center gap-2">
                  <Icon size={13} style={{ color: selectedCategory === cat.id ? undefined : color }} />
                  {toSentenceCase(cat.name)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}
