import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Upload, Trash2, Star, ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { dateTime } from '../../lib/format.js';
import { useToast } from '../../components/Toast.jsx';
import { PageSpinner, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';
import { useAuth } from './AdminApp.jsx';

const EMPTY = {
  name: '', sku: '', slug: '', description: '', specifications: '', price: '', compareAtPrice: '', costPrice: '',
  lowStockThreshold: 5, weightGrams: '', colors: '', sizes: '', tags: '', status: 'DRAFT',
  isFeatured: false, isNewArrival: false, isBestSeller: false, categoryId: '', initialStock: 0,
};

const MOVE_TYPES = [
  ['STOCK_IN', 'Stock in (new stock received)'],
  ['STOCK_OUT', 'Stock out (sold / removed)'],
  ['RETURN', 'Customer return'],
  ['DAMAGED', 'Damaged / write-off'],
  ['ADJUSTMENT', 'Manual correction (+/-)'],
];

function toForm(p) {
  return {
    ...EMPTY,
    ...p,
    compareAtPrice: p.compareAtPrice ?? '',
    costPrice: p.costPrice ?? '',
    weightGrams: p.weightGrams ?? '',
    colors: p.colors.join(', '),
    sizes: p.sizes.join(', '),
    tags: p.tags.join(', '),
  };
}

function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-taupe">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function StockPanel({ product, onChange }) {
  const toast = useToast();
  const { data, reload } = useFetch(`/api/admin/products/${product.id}/movements`);
  const [form, setForm] = useState({ type: 'STOCK_IN', quantity: '', reason: '', reference: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/api/admin/products/${product.id}/stock`, { ...form, quantity: Number(form.quantity) });
      toast(`Stock updated: now ${r.product.stock}`);
      setForm({ ...form, quantity: '', reason: '', reference: '' });
      onChange(r.product);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">Stock</h2>
        <p className="text-sm text-taupe">On hand: <span className="font-serif text-2xl text-espresso">{product.stock}</span></p>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <select className="input sm:col-span-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Movement type">
          {MOVE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" type="number" required placeholder={form.type === 'ADJUSTMENT' ? 'Change, e.g. -2 or 3' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-label="Quantity" />
        <input className="input" placeholder="Reference (optional)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} aria-label="Reference" />
        <input className="input sm:col-span-2" placeholder={['ADJUSTMENT', 'DAMAGED'].includes(form.type) ? 'Reason (required)' : 'Reason (optional)'} required={['ADJUSTMENT', 'DAMAGED'].includes(form.type)} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} aria-label="Reason" />
        <button className="btn-gold sm:col-span-2" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Record stock change</button>
      </form>
      <h3 className="mb-2 mt-6 font-sans text-sm font-medium">History</h3>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-taupe"><tr><th className="py-1.5">When</th><th>Type</th><th>Change</th><th>After</th><th>By</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data?.items.map((m) => (
              <tr key={m.id} title={[m.reason, m.reference].filter(Boolean).join(' · ')}>
                <td className="py-2">{dateTime(m.createdAt)}</td>
                <td>{m.type.replace('_', ' ').toLowerCase()}</td>
                <td className={m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                <td>{m.after}</td>
                <td>{m.actor?.name || 'System'}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan="5" className="py-4 text-center text-taupe">No stock changes yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImagesPanel({ product, onChange, canEdit }) {
  const toast = useToast();
  const input = useRef();
  const [busy, setBusy] = useState(false);

  const upload = async (files) => {
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    setBusy(true);
    try {
      const r = await api.post(`/api/admin/products/${product.id}/images`, fd);
      onChange(r.product);
      toast('Images uploaded');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      input.current.value = '';
    }
  };
  const reorder = async (ids) => {
    try {
      const r = await api.put(`/api/admin/products/${product.id}/images/order`, { imageIds: ids });
      onChange(r.product);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const move = (i, dir) => {
    const ids = product.images.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(ids);
  };
  const remove = async (img) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      const r = await api.del(`/api/admin/products/${product.id}/images/${img.id}`);
      onChange(r.product);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl">Images</h2>
        {canEdit && (
          <>
            <button type="button" className="btn-outline" onClick={() => input.current.click()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            </button>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
          </>
        )}
      </div>
      {product.images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-taupe">No images yet. The first image is shown as the main photo.</p>
      ) : (
        <motion.div layout className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {product.images.map((img, i) => (
              <motion.div layout key={img.id} exit={{ opacity: 0, scale: 0.9 }} className="group relative overflow-hidden rounded-xl border border-line">
                <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                {i === 0 && <span className="chip absolute left-2 top-2 bg-gold text-white"><Star className="mr-1 h-3 w-3" />Main</span>}
                {canEdit && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-espresso/60 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-warm hover:bg-white/20" aria-label="Move left"><ChevronLeft className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-warm hover:bg-white/20" aria-label="Move right"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="flex gap-1">
                      {i !== 0 && <button type="button" onClick={() => reorder([img.id, ...product.images.filter((x) => x.id !== img.id).map((x) => x.id)])} className="rounded p-1 text-warm hover:bg-white/20" aria-label="Make main image"><Star className="h-4 w-4" /></button>}
                      <button type="button" onClick={() => remove(img)} className="rounded p-1 text-warm hover:bg-white/20" aria-label="Delete image"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can('products:write');
  const { data, loading, error } = useFetch(isNew ? null : `/api/admin/products/${id}`);
  const { data: cats } = useFetch('/api/admin/categories');
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    if (data?.product) {
      setProduct(data.product);
      setForm(toForm(data.product));
    }
  }, [data]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      ...form,
      price: form.price === '' ? undefined : Number(form.price),
      categoryId: Number(form.categoryId) || undefined,
      lowStockThreshold: Number(form.lowStockThreshold),
      initialStock: Number(form.initialStock) || 0,
    };
    ['id', 'stock', 'images', 'category', 'availability', 'inStock', 'discountPercent', 'createdAt', 'updatedAt', 'viewCount'].forEach((k) => delete body[k]);
    if (!isNew) delete body.initialStock;
    try {
      if (isNew) {
        const r = await api.post('/api/admin/products', body);
        if (newImages.length) {
          const fd = new FormData();
          newImages.forEach((f) => fd.append('images', f));
          await api.post(`/api/admin/products/${r.product.id}/images`, fd).catch((err) => toast(`Product saved, but images failed: ${err.message}`, 'error'));
        }
        toast('Product created');
        navigate(`/admin/products/${r.product.id}`, { replace: true });
      } else {
        const r = await api.put(`/api/admin/products/${id}`, body);
        setProduct(r.product);
        setForm(toForm(r.product));
        toast('Changes saved');
      }
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const destroy = async () => {
    if (!window.confirm(`Delete "${product.name}" permanently? Consider archiving instead to keep its history.`)) return;
    try {
      await api.del(`/api/admin/products/${id}`);
      toast('Product deleted');
      navigate('/admin/products');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (error) return <ErrorState error={error} />;
  if (!isNew && (loading || !product)) return <PageSpinner />;

  return (
    <>
      <Link to="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-taupe hover:text-espresso"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <PageHeader
        title={isNew ? 'New product' : product.name}
        subtitle={isNew ? 'Add a product to your catalog' : `SKU ${product.sku}`}
        actions={!isNew && product.status === 'PUBLISHED' && <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink className="h-4 w-4" /> View on store</a>}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={save} className="space-y-6 lg:col-span-3">
          <fieldset disabled={!canEdit} className="card space-y-5 p-6">
            <h2 className="text-xl">Details</h2>
            <Field label="Product name *" error={errors.name}><input className="input" required value={form.name} onChange={set('name')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU *" error={errors.sku}><input className="input" required value={form.sku} onChange={set('sku')} /></Field>
              <Field label="Category *" error={errors.categoryId}>
                <select className="input" required value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">Choose…</option>
                  {cats?.items.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description" error={errors.description}><textarea className="input min-h-[120px]" value={form.description} onChange={set('description')} /></Field>
            <Field label="Specifications / care" error={errors.specifications} hint="One detail per line"><textarea className="input min-h-[80px]" value={form.specifications} onChange={set('specifications')} /></Field>
            <Field label="URL slug" error={errors.slug} hint="Leave empty to generate from the name"><input className="input" value={form.slug} onChange={set('slug')} /></Field>
          </fieldset>

          <fieldset disabled={!canEdit} className="card space-y-5 p-6">
            <h2 className="text-xl">Pricing (NPR)</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Selling price *" error={errors.price}><input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={set('price')} /></Field>
              <Field label="Original price" error={errors.compareAtPrice} hint="Shows a discount"><input className="input" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={set('compareAtPrice')} /></Field>
              <Field label="Cost price" error={errors.costPrice} hint="Private, for stock value"><input className="input" type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} /></Field>
            </div>
          </fieldset>

          <fieldset disabled={!canEdit} className="card space-y-5 p-6">
            <h2 className="text-xl">Options & tags</h2>
            <Field label="Colours" hint="Comma separated, e.g. Beige, Gold" error={errors.colors}><input className="input" value={form.colors} onChange={set('colors')} /></Field>
            <Field label="Sizes" hint="Comma separated" error={errors.sizes}><input className="input" value={form.sizes} onChange={set('sizes')} /></Field>
            <Field label="Tags" hint="Used for search and filters" error={errors.tags}><input className="input" value={form.tags} onChange={set('tags')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Low-stock alert at" error={errors.lowStockThreshold}><input className="input" type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} /></Field>
              <Field label="Weight (grams)" error={errors.weightGrams}><input className="input" type="number" min="0" value={form.weightGrams} onChange={set('weightGrams')} /></Field>
            </div>
            {isNew && <Field label="Opening stock" hint="Recorded as a stock-in movement" error={errors.initialStock}><input className="input" type="number" min="0" value={form.initialStock} onChange={set('initialStock')} /></Field>}
          </fieldset>

          <fieldset disabled={!canEdit} className="card space-y-4 p-6">
            <h2 className="text-xl">Visibility</h2>
            <Field label="Status">
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="DRAFT">Draft (hidden from store)</option>
                <option value="PUBLISHED">Published (visible on store)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
            <div className="flex flex-wrap gap-5 text-sm">
              {[['isFeatured', 'Featured'], ['isNewArrival', 'New arrival'], ['isBestSeller', 'Best seller']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C99A63]" checked={form[k]} onChange={set(k)} />{l}</label>
              ))}
            </div>
          </fieldset>

          {isNew && canEdit && (
            <div className="card p-6">
              <h2 className="text-xl">Images</h2>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="mt-4 block text-sm" onChange={(e) => setNewImages([...e.target.files])} />
              <p className="mt-2 text-xs text-taupe">The first image becomes the main photo. You can reorder after saving.</p>
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary px-8" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{isNew ? 'Create product' : 'Save changes'}</button>
              {!isNew && <button type="button" className="btn-danger ml-auto" onClick={destroy}><Trash2 className="h-4 w-4" /> Delete</button>}
            </div>
          )}
        </form>

        {!isNew && (
          <div className="space-y-6 lg:col-span-2">
            <ImagesPanel product={product} onChange={setProduct} canEdit={canEdit} />
            {can('inventory:write') && <StockPanel product={product} onChange={setProduct} />}
          </div>
        )}
      </div>
    </>
  );
}
