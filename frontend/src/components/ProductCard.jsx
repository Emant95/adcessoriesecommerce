import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Eye } from 'lucide-react';
import { money } from '../lib/format.js';
import { useWishlist } from '../lib/wishlist.js';
import { useToast } from './Toast.jsx';

export function WishButton({ product, className = '' }) {
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const active = has(product.slug);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      aria-pressed={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={(e) => {
        e.preventDefault();
        const added = toggle(product);
        toast(added ? 'Saved to your wishlist' : 'Removed from wishlist');
      }}
      className={`grid h-9 w-9 place-items-center rounded-full bg-warm/90 shadow-soft backdrop-blur ${className}`}
    >
      <motion.span key={String(active)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
        <Heart className={`h-4 w-4 ${active ? 'fill-rose text-rose' : 'text-espresso'}`} />
      </motion.span>
    </motion.button>
  );
}

export default function ProductCard({ product, onQuickView }) {
  const img = product.images[0];
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="group">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl2 border border-line bg-ivory shadow-soft transition-shadow duration-300 group-hover:shadow-lift">
          <div className="aspect-[4/5] overflow-hidden">
            {img ? (
              <img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-cream" />
            )}
          </div>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.discountPercent > 0 && <span className="chip bg-rose-soft text-espresso">-{product.discountPercent}%</span>}
            {product.isNewArrival && <span className="chip bg-warm/90 text-gold-dark">New</span>}
            {product.isBestSeller && <span className="chip bg-espresso/85 text-warm">Best seller</span>}
          </div>
          <WishButton product={product} className="absolute right-3 top-3" />
          {!product.inStock && (
            <div className="absolute inset-x-3 bottom-3 rounded-full bg-warm/90 py-1.5 text-center text-xs font-medium text-taupe">Out of stock</div>
          )}
          {onQuickView && product.inStock && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
              className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-warm/95 py-2 text-xs font-medium opacity-0 shadow-soft transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
            >
              <Eye className="h-3.5 w-3.5" /> Quick view
            </button>
          )}
        </div>
        <div className="mt-3 px-1">
          <p className="text-[11px] uppercase tracking-wider text-taupe">{product.category?.name}</p>
          <h3 className="mt-0.5 font-sans text-[15px] font-medium leading-snug">{product.name}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-medium">{money(product.price)}</span>
            {product.discountPercent > 0 && <span className="text-sm text-taupe line-through">{money(product.compareAtPrice)}</span>}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
