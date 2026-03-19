import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onReset?: () => void;
  queryText?: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  heading,
  message,
  actionLabel,
  onAction,
  onReset,
  queryText,
  onClearSearch,
  onClearFilters,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 gap-4 text-center">
      <div className="text-text-muted opacity-60">
        {icon ?? <ShoppingBag size={64} />}
      </div>
      <h3 className="text-xl font-semibold text-text-primary">
        {heading ?? 'Nenhum produto encontrado'}
      </h3>
      <p className="text-base text-text-secondary max-w-sm">
        {message}
      </p>
      {queryText && (
        <p className="text-sm text-text-muted">
          Busca: <span className="font-medium text-text-primary">{queryText}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {queryText && onClearSearch && (
          <button
            onClick={onClearSearch}
            className="px-4 py-1.5 border border-border rounded-md text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Limpar busca
          </button>
        )}
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-1.5 border border-border rounded-md text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Limpar filtros
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-5 py-2 bg-accent-gradient text-white rounded-md text-sm font-medium transition-opacity hover:opacity-85"
          >
            Limpar tudo
          </button>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-5 py-2 bg-accent-gradient text-white rounded-md text-sm font-medium transition-opacity hover:opacity-85"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
