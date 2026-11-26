import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Quote, Sparkles } from 'lucide-react';
import { useSite } from '../../lib/content.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { useSeo } from '../../lib/seo.js';
import ProductCard from '../../components/ProductCard.jsx';
import QuickView from '../../components/QuickView.jsx';
import Reveal from '../../components/Reveal.jsx';
import { ProductSkeleton } from '../../components/Skeleton.jsx';

function ProductRow({ title, eyebrow, url, link, onQuickView }) {
  const { data, loading } = useFetch(url);
  const items = data?.items || [];
  if (!loading && !items.length) return null;
  return (
    <section className="container-x mt-20">
      <Reveal className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">{title}</h2>
        </div>
        <Link to={link} className="hidden items-center gap-1 text-sm text-taupe hover:text-gold-dark sm:flex">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={i} />)
          : items.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} onQuickView={onQuickView} />
              </Reveal>
            ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { content, categories } = useSite();
  const [quick, setQuick] = useState(null);
  const hero = content.hero || {};
  const store = content.store || {};
  const testimonials = content.testimonials?.items || [];
  useSeo({ title: `${store.name || 'Adcessories'} | ${store.tagline || 'Accessories boutique'}`, description: hero.subheadline });

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-cream/70 to-warm">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="eyebrow flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> {store.tagline || 'New season'}</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl lg:text-6xl">{hero.headline || 'Accessories you will love'}</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-taupe">{hero.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={hero.ctaLink || '/shop'} className="btn-primary px-7 py-3">
                {hero.ctaLabel || 'Shop Now'} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/new-arrivals" className="btn-outline px-7 py-3">New arrivals</Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.1 }} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-rose-soft/40 blur-2xl" />
            {hero.imageUrl && <img src={hero.imageUrl} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-lift sm:aspect-square" />}
          </motion.div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-x mt-16">
          <Reveal className="mb-8 text-center">
            <p className="eyebrow">Browse</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Shop by category</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.slice(0, 8).map((c, i) => (
              <Reveal key={c.id} delay={i * 0.05}>
                <Link to={`/category/${c.slug}`} className="group block overflow-hidden rounded-xl2 border border-line bg-ivory shadow-soft transition-shadow hover:shadow-lift">
                  <div className="aspect-square overflow-hidden">
                    {c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="h-full bg-cream" />}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-taupe">{c.productCount}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <ProductRow eyebrow="Just in" title="New arrivals" url="/api/products?newArrival=true&limit=4" link="/new-arrivals" onQuickView={setQuick} />
      <ProductRow eyebrow="Loved by you" title="Best sellers" url="/api/products?bestSeller=true&limit=4" link="/best-sellers" onQuickView={setQuick} />
      <ProductRow eyebrow="Trending" title="Featured picks" url="/api/products?featured=true&sort=popular&limit=4" link="/shop?featured=true" onQuickView={setQuick} />
      <ProductRow eyebrow="Special offers" title="On sale now" url="/api/products?onSale=true&limit=4" link="/shop?onSale=true" onQuickView={setQuick} />

      {testimonials.length > 0 && (
        <section className="mt-24 bg-cream/60 py-20">
          <div className="container-x">
            <Reveal className="mb-10 text-center">
              <p className="eyebrow">Kind words</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">From our customers</h2>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={i} delay={i * 0.08} className="card p-7">
                  <Quote className="h-6 w-6 text-gold" />
                  <p className="mt-4 leading-relaxed">{t.text}</p>
                  <p className="mt-5 text-sm font-medium">{t.name}</p>
                  {t.location && <p className="text-xs text-taupe">{t.location}</p>}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
