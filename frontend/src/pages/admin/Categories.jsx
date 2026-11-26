import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Loader2, ImagePlus, FolderTree } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { useToast } from '../../components/Toast.jsx';
import { Skeleton, EmptyState, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';
import { useAuth } from './AdminApp.jsx';

const BLANK = { name: '', slug: '', description: '', sortOrder: 0, isActive: true, parentId: '' };

function Editor({ category, all, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(category ? { ...BLANK, ...category, parentId: category.parentId || '', description: category.description || '' } : BLANK);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name: form.name, slug: form.slug || undefined, description: form.description, sortOrder: Number(form.sortOrder), isActive: form.isActive, parentId: form.parentId ? Number(form.parentId) : null };
      const r = category ? await api.put(`/api/admin/categories/${category.id}`, body) : await api.post('/api/admin/categories', body);
      if (file) {
        const fd = new FormData();
        fd.append('image', file);
        await api.post(`/api/admin/categories/${r.category.id}/image`, fd);
      }
      toast(category ? 'Category updated' : 'Category created');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const parents = all.filter((c) => !c.parentId && c.id !== category?.id);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} onClick={(e) => e.stopPropagation()} onSubmit={save} className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto bg-warm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">{category ? 'Edit category' : 'New category'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
        <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={set('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Parent</label>
            <select className="input" value={form.parentId} onChange={set('parentId')}>
              <option value="">None (top level)</option>
              {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Display order</label><input className="input" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} /></div>
        </div>
        <div><label className="label">URL slug</label><input className="input" value={form.slug} onChange={set('slug')} placeholder="Generated from name" /></div>
        <div>
          <label className="label">Image</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#C99A63]" checked={form.isActive} onChange={set('isActive')} /> Active (visible on store)</label>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
      </motion.form>
    </motion.div>
  );
}

export default function Categories() {
  const { data, loading, error, reload } = useFetch('/api/admin/categories');
  const { can } = useAuth();
  const canEdit = can('categories:write');
  const toast = useToast();
  const [editing, setEditing] = useState(undefined);
  const items = data?.items || [];
  const ordered = items.filter((c) => !c.parentId).flatMap((p) => [p, ...items.filter((c) => c.parentId === p.id)]);

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await api.del(`/api/admin/categories/${c.id}`);
      toast('Category deleted');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const toggle = async (c) => {
    try {
      await api.put(`/api/admin/categories/${c.id}`, { name: c.name, description: c.description, sortOrder: c.sortOrder, isActive: !c.isActive, parentId: c.parentId });
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="Organise how products are grouped on the store" actions={canEdit && <button className="btn-primary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add category</button>} />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={FolderTree} title="No categories yet" text="Create a category before adding products." />
      ) : (
        <div className="card divide-y divide-line">
          {ordered.map((c) => (
            <div key={c.id} className={`flex items-center gap-4 p-4 ${c.parentId ? 'pl-12' : ''}`}>
              {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-cream"><ImagePlus className="h-4 w-4 text-taupe" /></div>}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-taupe">/{c.slug} · {c._count.products} product(s) · order {c.sortOrder}</p>
              </div>
              <button disabled={!canEdit} onClick={() => toggle(c)} className={`chip ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{c.isActive ? 'Active' : 'Hidden'}</button>
              {canEdit && (
                <>
                  <button className="btn-ghost !p-2" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button>
                  <button className="btn-ghost !p-2 hover:!text-red-600" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {editing !== undefined && <Editor category={editing} all={items} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} />}
      </AnimatePresence>
    </>
  );
}
