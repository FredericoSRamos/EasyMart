interface SortControlProps {
  value: string;
  onChange: (ordering: string) => void;
}

export const SORT_OPTIONS = [
  { value: 'price', label: 'Menor preco' },
  { value: '-price', label: 'Maior preco' },
  { value: 'name', label: 'Nome A-Z' },
  { value: '-name', label: 'Nome Z-A' },
];

export default function SortControl({ value, onChange }: SortControlProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg-secondary border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-accent-primary transition-colors"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
