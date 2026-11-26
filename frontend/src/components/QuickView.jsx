import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { money, availabilityLabel } from '../lib/format.js';
import { WishButton } from './ProductCard.jsx';

export default function QuickView({ product, onClose }) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="relative grid w-full max-w-3xl overflow-hidden rounded-xl2 bg-warm shadow-lift md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-warm/90" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <img src={product.images[0]?.url} alt={product.name} className="aspect-square h-full w-full object-cover" />
            <div className="flex flex-col p-6 md:p-8">
              <p className="eyebrow">{product.category?.name}</p>
              <h2 className="mt-2 text-2xl">{product.name}</h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-medium">{money(product.price)}</span>
                {product.discountPercent > 0 && <span className="text-taupe line-through">{money(product.compareAtPrice)}</span>}
              </div>
              <span className={`chip mt-3 w-fit ${availabilityLabel[product.availability].cls}`}>{availabilityLabel[product.availability].text}</span>
              <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-taupe">{product.description}</p>
              {product.colors.length > 0 && <p className="mt-3 text-sm"><span className="text-taupe">Colours:</span> {product.colors.join(', ')}</p>}
              <div className="mt-auto flex items-center gap-3 pt-6">
                <Link to={`/product/${product.slug}`} className="btn-primary flex-1" onClick={onClose}>
                  View details
                </Link>
                <WishButton product={product} className="!h-11 !w-11 border border-line" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
