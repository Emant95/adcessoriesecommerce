import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, PackageOpen } from 'lucide-react';
import { api, qs } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { money } from '../../lib/format.js';
import { useToast } from '../../components/Toast.jsx';
import Pagination from '../../components/Pagination.jsx';
import { Skeleton, EmptyState, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';
import { useAuth } from './AdminApp.jsx';

const STATUS_CLS = { PUBLISHED: 'bg-emerald-50 text-emerald-700', DRAFT: 'bg-stone-100 text-stone-600', ARCHIVED: 'bg-red-50 text-red-600' };

function stockBadge(p) {
  if (p.stock <= 0) return <span className="chip bg-red-50 text-red-600">Out</span>;
  if (p.stock <= p.lowStockThreshold) return <span className="chip bg-amber-50 text-amber-700">{p.stock} low</span>;
  return <span className="text-sm">{p.stock}</span>;
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState(params.get('search') || '');
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n, { replace: true });
  };
  const url = `/api/admin/products${qs({ search: params.get('search'), status: params.get('status'), categoryId: params.get('categoryId'), stock: params.get('stock'), sort: params.get('sort'), page: params.get('page') })}`;
  const { data, loading, error, reload } = useFetch(url);
  const { data: cats } = useFetch('/api/admin/categories');

  const bulk = async (action) => {
    try {
      const r = await api.post('/api/admin/products/bulk', { ids: selected, action });
      toast(`Updated ${r.updated} product(s)`);
      setSelected([]);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((p) => selected.includes(p.id));

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={data ? `${data.total} product(s)` : ' '}
        actions={
          <>
            <a href="/api/admin/products/export.csv" className="btn-outline"><Download className="h-4 w-4" /> Export CSV</a>
            {can('products:write') && <Link to="/admin/products/new" className="btn-primary"><Plus className="h-4 w-4" /> Add product</Link>}
          </>
        }
      />
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <form className="relative min-w-[200px] flex-1" onSubmit={(e) => { e.preventDefault(); set('search', search.trim()); }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe" />
          <input className="input !pl-9" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        </form>
        <select className="input !w-auto" value={params.get('status') || ''} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">Active (not archived)</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select className="input !w-auto" value={params.get('categoryId') || ''} onChange={(e) => set('categoryId', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats?.items.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</option>)}
        </select>
        <select className="input !w-auto" value={params.get('stock') || ''} onChange={(e) => set('stock', e.target.value)} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {selected.length > 0 && can('products:write') && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl2 bg-cream px-4 py-3 text-sm">
          <span className="mr-2 font-medium">{selected.length} selected</span>
          <button className="btn-outline !py-1.5" onClick={() => bulk('publish')}>Publish</button>
          <button className="btn-outline !py-1.5" onClick={() => bulk('unpublish')}>Unpublish</button>
          <button className="btn-outline !py-1.5" onClick={() => bulk('feature')}>Feature</button>
          <button className="btn-outline !py-1.5" onClick={() => bulk('unfeature')}>Unfeature</button>
          <button className="btn-danger !py-1.5" onClick={() => bulk('archive')}>Archive</button>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No products here" text="Try changing the filters, or add your first product." action={can('products:write') && <Link to="/admin/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="w-10 p-4"><input type="checkbox" className="accent-[#C99A63]" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? items.map((p) => p.id) : [])} aria-label="Select all" /></th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-cream/40">
                  <td className="p-4"><input type="checkbox" className="accent-[#C99A63]" checked={selected.includes(p.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} aria-label={`Select ${p.name}`} /></td>
                  <td className="p-4">
                    <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-gold-dark">
                      {p.images[0] ? <img src={p.images[0].url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="h-11 w-11 rounded-lg bg-cream" />}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-taupe">{p.sku}{p.isFeatured ? ' · Featured' : ''}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 text-taupe">{p.category?.name}</td>
                  <td className="p-4">{money(p.price)}{p.compareAtPrice ? <span className="ml-1 text-xs text-taupe line-through">{money(p.compareAtPrice)}</span> : null}</td>
                  <td className="p-4">{stockBadge(p)}</td>
                  <td className="p-4"><span className={`chip ${STATUS_CLS[p.status]}`}>{p.status.toLowerCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set('page', String(p))} />}
    </>
  );
}
