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
        className={`w-full h-40 sm:h-44 lg:h-48 flex items-center justify-center relative shrink-0 transition-all ${
          product.image_url ? 'bg-white' : ''
        }`}
        style={!product.image_url ? { background: `${iconColor}14` } : undefined}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-4 product-image-enter"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
              if (nextEl) nextEl.style.display = 'block';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.background = `${iconColor}14`;
                parent.classList.remove('bg-white');
              }
            }}
          />
        ) : null}
        <CategoryIcon 
          size={56} 
          style={{ 
            color: iconColor, 
            opacity: 0.8, 
            display: product.image_url ? 'none' : 'block' 
          }} 
        />

        {discount > 0 && (
          <span
            className="absolute top-3 left-3 text-white text-[0.7rem] font-bold px-2 py-0.5 rounded-md leading-none shadow-md border border-white/10"
            style={{ background: '#ef4444' }}
          >
            -{discount}%
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 px-4 lg:px-5 pt-4 pb-5 gap-2 border-t border-white/5">
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
