import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Truck, MessageCircle, Mail, ChevronRight, PackageX } from 'lucide-react';
import { useFetch } from '../../lib/useFetch.js';
import { useSite } from '../../lib/content.jsx';
import { useSeo } from '../../lib/seo.js';
import { money, availabilityLabel } from '../../lib/format.js';
import ProductCard, { WishButton } from '../../components/ProductCard.jsx';
import Reveal from '../../components/Reveal.jsx';
import { Skeleton, EmptyState } from '../../components/Skeleton.jsx';

const RECENT_KEY = 'adc_recent';

function useRecentlyViewed(product) {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (!product) return;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
      list = [];
    }
    setRecent(list.filter((p) => p.slug !== product.slug).slice(0, 4));
    const entry = { slug: product.slug, name: product.name, price: product.price, image: product.images[0]?.url };
    localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...list.filter((p) => p.slug !== product.slug)].slice(0, 10)));
  }, [product?.slug]);
  return recent;
}

function Gallery({ images, name }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  const img = images[active];
  if (!img) return <div className="aspect-square rounded-xl2 bg-cream" />;
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row md:sticky md:top-24">
      {images.length > 1 && (
        <div className="flex gap-3 sm:flex-col">
          {images.map((im, i) => (
            <button key={im.id} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} className={`h-16 w-16 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${i === active ? 'border-gold' : 'border-transparent'}`}>
              <img src={im.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-xl2 border border-line bg-ivory"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={img.id}
            src={img.url}
            alt={img.alt || name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="aspect-square w-full object-cover transition-transform duration-300"
            style={zoom ? { transform: 'scale(1.8)', transformOrigin: zoom } : undefined}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch(`/api/products/${slug}`);
  const { content } = useSite();
  const product = data?.product;
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const recent = useRecentlyViewed(product);

  useEffect(() => {
    setColor('');
    setSize('');
  }, [slug]);

  useSeo({
    title: product ? `${product.name} | ${content.store?.name || 'Adcessories'}` : 'Product',
    description: product?.description,
    jsonLd: product && {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      sku: product.sku,
      description: product.description,
      image: product.images.map((i) => new URL(i.url, window.location.origin).href),
      category: product.category?.name,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NPR',
        price: product.price,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    },
  });

  if (error) {
    return (
      <div className="container-x py-16">
        <EmptyState icon={PackageX} title="We couldn't find this product" text="It may have been removed or is no longer available." action={<Link to="/shop" className="btn-outline">Back to shop</Link>} />
      </div>
    );
  }

  if (loading || !product) {
    return (
      <div className="container-x grid gap-10 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl2" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  const contact = content.contact || {};
  const options = [color && `Colour: ${color}`, size && `Size: ${size}`].filter(Boolean).join(', ');
  const enquiry = `Hi! I'm interested in ${product.name} (SKU ${product.sku})${options ? `, ${options}` : ''}. Is it available?`;
  const whatsapp = contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(enquiry)}` : null;
  const mail = contact.email ? `mailto:${contact.email}?subject=${encodeURIComponent(`Enquiry: ${product.name}`)}&body=${encodeURIComponent(enquiry)}` : null;
  const avail = availabilityLabel[product.availability];

  return (
    <div className="container-x py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-taupe" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-espresso">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {product.category && (
          <>
            <Link to={`/category/${product.category.slug}`} className="hover:text-espresso">{product.category.name}</Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-espresso">{product.name}</span>
      </nav>

      <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
        <Gallery images={product.images} name={product.name} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="eyebrow">{product.category?.name}</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-xs text-taupe">SKU: {product.sku}</p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-medium">{money(product.price)}</span>
            {product.discountPercent > 0 && (
              <>
                <span className="text-lg text-taupe line-through">{money(product.compareAtPrice)}</span>
                <span className="chip bg-rose-soft text-espresso">Save {product.discountPercent}%</span>
              </>
            )}
          </div>
          <span className={`chip mt-4 ${avail.cls}`}>{avail.text}</span>

          {product.colors.length > 0 && (
            <div className="mt-6">
              <p className="label">Colour {color && <span className="normal-case text-espresso">· {color}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button key={c} onClick={() => setColor(c === color ? '' : c)} aria-pressed={c === color} className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${c === color ? 'border-espresso bg-espresso text-warm' : 'border-line hover:border-gold'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="mt-5">
              <p className="label">Size {size && <span className="normal-case text-espresso">· {size}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s === size ? '' : s)} aria-pressed={s === size} className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${s === size ? 'border-espresso bg-espresso text-warm' : 'border-line hover:border-gold'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-primary flex-1 py-3">
                <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
              </a>
            )}
            {mail && (
              <a href={mail} className={`${whatsapp ? 'btn-outline' : 'btn-primary'} flex-1 py-3`}>
                <Mail className="h-4 w-4" /> Enquire by email
              </a>
            )}
            {!whatsapp && !mail && <Link to="/contact" className="btn-primary flex-1 py-3">Contact us about this item</Link>}
            <WishButton product={product} className="!h-12 !w-12 border border-line" />
          </div>

          {product.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-taupe">{product.description}</p>}

          {product.specifications && (
            <details className="mt-6 border-t border-line pt-4" open>
              <summary className="cursor-pointer text-sm font-medium">Details & care</summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-taupe">{product.specifications}</p>
            </details>
          )}
          {content.policies?.shipping && (
            <details className="mt-4 border-t border-line pt-4">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-gold" /> Delivery</summary>
              <p className="mt-3 text-sm leading-relaxed text-taupe">{content.policies.shipping}</p>
            </details>
          )}
        </motion.div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-20">
          <Reveal><h2 className="mb-8 text-3xl">You may also like</h2></Reveal>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
            {data.related.map((p, i) => <Reveal key={p.id} delay={i * 0.06}><ProductCard product={p} /></Reveal>)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl">Recently viewed</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recent.map((p) => (
              <Link key={p.slug} to={`/product/${p.slug}`} className="w-36 shrink-0">
                <img src={p.image} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <p className="mt-2 truncate text-sm">{p.name}</p>
                <p className="text-xs text-taupe">{money(p.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
