import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X, SearchX } from 'lucide-react';
import { qs } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { useSite } from '../../lib/content.jsx';
import { useSeo } from '../../lib/seo.js';
import ProductCard from '../../components/ProductCard.jsx';
import QuickView from '../../components/QuickView.jsx';
import Pagination from '../../components/Pagination.jsx';
import { ProductSkeleton, EmptyState, ErrorState } from '../../components/Skeleton.jsx';

const SORTS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['popular', 'Most popular'],
  ['best_selling', 'Best selling'],
];

const PRESETS = {
  newArrival: { title: 'New arrivals', text: 'Fresh pieces, just landed.' },
  bestSeller: { title: 'Best sellers', text: 'The pieces everyone keeps coming back for.' },
};

function Chips({ title, options, selected, onToggle }) {
  if (!options?.length) return null;
  return (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button key={o} onClick={() => onToggle(o)} aria-pressed={on} className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'border-espresso bg-espresso text-warm' : 'border-line bg-warm hover:border-gold'}`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Shop({ preset }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { categories } = useSite();
  const { data: filters } = useFetch('/api/filters');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quick, setQuick] = useState(null);

  const get = (k) => params.get(k) || '';
  const getList = (k) => (params.get(k) ? params.get(k).split(',') : []);
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null || v === false || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  const toggleIn = (k, v) => {
    const cur = getList(k);
    update({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const query = {
    search: get('search'),
    category: slug,
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    colors: getList('colors'),
    sizes: getList('sizes'),
    tags: getList('tags'),
    inStock: get('inStock') === 'true',
    onSale: get('onSale') === 'true',
    featured: get('featured') === 'true',
    newArrival: preset === 'newArrival',
    bestSeller: preset === 'bestSeller',
    sort: get('sort') || 'newest',
    page: get('page') || 1,
    limit: 12,
  };
  const url = `/api/products${qs(query)}`;
  const { data, loading, error, reload } = useFetch(url);
  const { data: catData } = useFetch(slug ? `/api/categories/${slug}` : null);
  const category = catData?.category;

  const heading = useMemo(() => {
    if (preset) return PRESETS[preset];
    if (category) return { title: category.name, text: category.description };
    if (query.search) return { title: `Results for “${query.search}”`, text: '' };
    return { title: 'Shop all', text: 'Every piece in our boutique.' };
  }, [preset, category, query.search]);

  useSeo({ title: `${heading.title} | Adcessories`, description: heading.text });
  useEffect(() => {
    setFiltersOpen(false);
  }, [slug, preset]);

  const activeCount = ['minPrice', 'maxPrice', 'colors', 'sizes', 'tags', 'inStock', 'onSale', 'featured'].filter((k) => params.get(k)).length;

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <p className="label">Category</p>
        <ul className="space-y-1 text-sm">
          <li><Link to="/shop" className={`block rounded-lg px-2 py-1.5 hover:bg-cream ${!slug ? 'font-medium text-gold-dark' : ''}`}>All products</Link></li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link to={`/category/${c.slug}${params.toString() ? `?${params}` : ''}`} className={`flex justify-between rounded-lg px-2 py-1.5 hover:bg-cream ${slug === c.slug ? 'font-medium text-gold-dark' : ''}`}>
                {c.name} <span className="text-xs text-taupe">{c.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label">Price (Rs.)</p>
        <div className="flex items-center gap-2">
          <input type="number" min="0" className="input" placeholder={filters ? String(filters.priceRange.min) : 'Min'} defaultValue={get('minPrice')} onBlur={(e) => update({ minPrice: e.target.value })} aria-label="Minimum price" />
          <span className="text-taupe">–</span>
          <input type="number" min="0" className="input" placeholder={filters ? String(filters.priceRange.max) : 'Max'} defaultValue={get('maxPrice')} onBlur={(e) => update({ maxPrice: e.target.value })} aria-label="Maximum price" />
        </div>
      </div>
      <div className="space-y-2.5 text-sm">
        {[['inStock', 'In stock only'], ['onSale', 'On sale'], ['featured', 'Featured']].map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" className="h-4 w-4 accent-[#C99A63]" checked={get(k) === 'true'} onChange={(e) => update({ [k]: e.target.checked ? 'true' : '' })} />
            {label}
          </label>
        ))}
      </div>
      <Chips title="Colour" options={filters?.colors} selected={getList('colors')} onToggle={(v) => toggleIn('colors', v)} />
      <Chips title="Size" options={filters?.sizes} selected={getList('sizes')} onToggle={(v) => toggleIn('sizes', v)} />
      <Chips title="Tags" options={filters?.tags} selected={getList('tags')} onToggle={(v) => toggleIn('tags', v)} />
      {activeCount > 0 && (
        <button className="btn-ghost w-full" onClick={() => setParams(get('search') ? { search: get('search') } : {}, { replace: true })}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container-x py-10">
      <div className="mb-8">
        {category?.parent && (
          <Link to={`/category/${category.parent.slug}`} className="text-xs text-taupe hover:text-gold-dark">{category.parent.name} /</Link>
        )}
        <h1 className="text-3xl sm:text-4xl">{heading.title}</h1>
        {heading.text && <p className="mt-2 text-taupe">{heading.text}</p>}
        {category?.children?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {category.children.map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="rounded-full border border-line px-3 py-1 text-xs hover:border-gold">{c.name}</Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block">{filterPanel}</aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button className="btn-outline lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <p className="hidden text-sm text-taupe lg:block">{data ? `${data.total} item${data.total === 1 ? '' : 's'}` : ' '}</p>
            <select className="input !w-auto !rounded-full" value={query.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : loading && !data ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6">{Array.from({ length: 6 }, (_, i) => <ProductSkeleton key={i} />)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={SearchX} title="No products found" text="Try removing a filter or searching for something else." action={<Link to="/shop" className="btn-outline">See all products</Link>} />
          ) : (
            <motion.div layout className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <ProductCard product={p} onQuickView={setQuick} />
                </motion.div>
              ))}
            </motion.div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div className="fixed inset-0 z-50 bg-espresso/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFiltersOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="ml-auto h-full w-80 max-w-[90%] overflow-y-auto bg-warm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X className="h-5 w-5" /></button>
              </div>
              {filterPanel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
