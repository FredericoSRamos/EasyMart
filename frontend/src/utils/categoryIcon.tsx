import {
  ShoppingBasket,
  PawPrint,
  Beef,
  Wine,
  Coffee,
  Cookie,
  Milk,
  Leaf,
  Sparkles,
  Baby,
  Snowflake,
  Croissant,
  Package,
  Home,
  Shirt,
  Fish,
  Beer,
  Grape,
  Wheat,
  FlameKindling,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICON_MAP: Array<{ patterns: RegExp; Icon: LucideIcon; color: string }> = [
  { patterns: /animais|pet/i, Icon: PawPrint, color: '#f59e0b' },
  { patterns: /açougue|carnes|aves|peixaria/i, Icon: Beef, color: '#ef4444' },
  { patterns: /bebidas alcoólicas|alcoólicas|vinhos|espumantes/i, Icon: Wine, color: '#a855f7' },
  { patterns: /cerveja|beer/i, Icon: Beer, color: '#f59e0b' },
  { patterns: /bebidas não alcoólicas|bebidas/i, Icon: Coffee, color: '#06b6d4' },
  { patterns: /biscoitos|chocolates/i, Icon: Cookie, color: '#d97706' },
  { patterns: /frios|laticínios|laticinios/i, Icon: Milk, color: '#60a5fa' },
  { patterns: /frutas|legumes|verduras|hortifruti/i, Icon: Leaf, color: '#22c55e' },
  { patterns: /higiene|perfumaria/i, Icon: Sparkles, color: '#ec4899' },
  { patterns: /bebê|criança|bebe/i, Icon: Baby, color: '#f472b6' },
  { patterns: /congelados/i, Icon: Snowflake, color: '#67e8f9' },
  { patterns: /padaria|matinais/i, Icon: Croissant, color: '#fb923c' },
  { patterns: /limpeza|cuidados com o lar|lavagem/i, Icon: Home, color: '#38bdf8' },
  { patterns: /cereais|farináceos|farinaceos/i, Icon: Wheat, color: '#fbbf24' },
  { patterns: /peixe|peixaria|fish/i, Icon: Fish, color: '#34d399' },
  { patterns: /bazar|utilidades/i, Icon: Package, color: '#94a3b8' },
  { patterns: /construmil/i, Icon: FlameKindling, color: '#f97316' },
  { patterns: /mercearia|alimentos|cesta básica|cesta basica/i, Icon: ShoppingBasket, color: '#a3e635' },
  { patterns: /uva|grape/i, Icon: Grape, color: '#c084fc' },
  { patterns: /roupa|vestuário/i, Icon: Shirt, color: '#818cf8' },
];

export function getCategoryIcon(categoryName: string): { Icon: LucideIcon; color: string } {
  for (const entry of CATEGORY_ICON_MAP) {
    if (entry.patterns.test(categoryName)) {
      return { Icon: entry.Icon, color: entry.color };
    }
  }
  return { Icon: Package, color: '#6c757d' };
}
