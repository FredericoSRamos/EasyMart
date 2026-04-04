import type { Product } from '../services/api';
import { formatPrice } from '../utils/formatPrice';
import { getCategoryIcon } from '../utils/categoryIcon';

interface ProductCardProps {
  product: Product;
  marketName: string;
  showMarket?: boolean;
}

function calcDiscount(price: string, promoPrice: string): number {
  const p = parseFloat(price);
  const pp = parseFloat(promoPrice);
  if (!p || !pp) return 0;
  return Math.round(((p - pp) / p) * 100);
}

export default function ProductCard({ product, marketName, showMarket = true }: ProductCardProps) {
  const primaryCategory = product.categories_names?.[0] ?? '';
  const { Icon: CategoryIcon, color: iconColor } = getCategoryIcon(primaryCategory);
  const discount = product.promo_price ? calcDiscount(product.price, product.promo_price) : 0;

  return (
    <article className="card-hover rounded-xl overflow-hidden flex flex-col border border-white/8 bg-bg-secondary">
      <div
        data-testid="image-placeholder"
        className="w-full h-32 sm:h-36 lg:h-40 flex items-center justify-center relative shrink-0 transition-all"
        style={{ background: `${iconColor}14` }}
      >
        <CategoryIcon size={52} style={{ color: iconColor, opacity: 0.8 }} />

        {discount > 0 && (
          <span
            className="absolute top-2.5 left-2.5 text-white text-[0.7rem] font-bold px-2 py-0.5 rounded-md leading-none"
            style={{ background: '#ef4444', boxShadow: '0 2px 6px rgba(239,68,68,0.45)' }}
          >
            -{discount}%
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 px-3.5 sm:px-4 lg:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 gap-1.5">
        <p className="text-base text-text-primary font-semibold line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
        </p>

        {showMarket && (
          <span className="text-[0.6rem] font-medium uppercase tracking-wider text-text-muted truncate">
            {marketName}
          </span>
        )}

        <div className="mt-auto pt-2 border-t border-white/5">
          {product.promo_price ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-green-400 leading-none">
                {formatPrice(product.promo_price)}
              </span>
              <span className="text-[0.72rem] text-text-muted line-through leading-none">
                {formatPrice(product.price)}
              </span>
            </div>
          ) : (
            <span className="text-xl sm:text-2xl font-bold text-text-primary leading-none">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
