import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useWishlist } from '../../lib/wishlist.js';
import { money } from '../../lib/format.js';
import { EmptyState } from '../../components/Skeleton.jsx';

export default function Wishlist() {
  const { items, toggle } = useWishlist();
  return (
    <div className="container-x py-12">
      <h1 className="text-4xl">Your wishlist</h1>
      <p className="mt-2 text-taupe">Saved on this device so you can come back to your favourites.</p>
      <div className="mt-10">
        {items.length === 0 ? (
          <EmptyState icon={Heart} title="No favourites yet" text="Tap the heart on any product to save it here." action={<Link to="/shop" className="btn-primary">Start browsing</Link>} />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {items.map((p) => (
                <motion.div key={p.slug} layout exit={{ opacity: 0, scale: 0.9 }} className="relative">
                  <Link to={`/product/${p.slug}`}>
                    <img src={p.image} alt="" className="aspect-[4/5] w-full rounded-xl2 border border-line object-cover" />
                    <p className="mt-2 font-medium">{p.name}</p>
                    <p className="text-sm text-taupe">{money(p.price)}</p>
                  </Link>
                  <button onClick={() => toggle(p)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-warm/90 shadow-soft" aria-label={`Remove ${p.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
