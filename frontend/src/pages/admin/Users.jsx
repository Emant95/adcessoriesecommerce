import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { dateTime } from '../../lib/format.js';
import { useToast } from '../../components/Toast.jsx';
import { Skeleton, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';

const ROLES = {
  SUPER_ADMIN: 'Super Admin: everything, including admin users',
  STORE_MANAGER: 'Store Manager: products, categories, stock',
  INVENTORY_MANAGER: 'Inventory Manager: stock only',
  CONTENT_MANAGER: 'Content Manager: site content and categories',
};

function Editor({ user, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(user ? { name: user.name, email: user.email, role: user.role, isActive: user.isActive, password: '' } : { name: '', email: '', role: 'STORE_MANAGER', isActive: true, password: '' });
  const save = async (e) => {
    e.preventDefault();
    try {
      if (user) await api.put(`/api/admin/users/${user.id}`, { name: form.name, role: form.role, isActive: form.isActive, password: form.password });
      else await api.post('/api/admin/users', { name: form.name, email: form.email, role: form.role, password: form.password });
      toast(user ? 'User updated' : 'User created');
      onSaved();
    } catch (err) {
      toast(err.details?.[0]?.message || err.message, 'error');
    }
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form initial={{ y: 20 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} onSubmit={save} className="card w-full max-w-md space-y-4 bg-warm p-6">
        <div className="flex justify-between"><h2 className="text-xl">{user ? 'Edit admin' : 'New admin'}</h2><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></div>
        <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="input" type="email" required disabled={Boolean(user)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">{user ? 'New password (leave empty to keep)' : 'Password (min 8 characters)'}</label><input className="input" type="password" minLength={8} required={!user} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        {user && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#C99A63]" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Account active</label>}
        <button className="btn-primary w-full">Save</button>
      </motion.form>
    </motion.div>
  );
}

export default function Users() {
  const { data, loading, error, reload } = useFetch('/api/admin/users');
  const [editing, setEditing] = useState(undefined);
  return (
    <>
      <PageHeader title="Admin users" subtitle="People who can sign in to this portal" actions={<button className="btn-primary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add admin</button>} />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-40" /> : (
        <div className="card divide-y divide-line">
          {data.items.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cream font-serif text-gold">{u.name[0]}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.name} <span className="text-xs text-taupe">· {u.email}</span></p>
                <p className="text-xs text-taupe">{ROLES[u.role].split(':')[0]} · Last sign in {u.lastLoginAt ? dateTime(u.lastLoginAt) : 'never'}</p>
              </div>
              <span className={`chip ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{u.isActive ? 'Active' : 'Disabled'}</span>
              <button className="btn-ghost !p-2" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Pencil className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>{editing !== undefined && <Editor user={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} />}</AnimatePresence>
    </>
  );
}
