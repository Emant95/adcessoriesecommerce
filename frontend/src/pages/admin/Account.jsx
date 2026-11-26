import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { PageHeader } from './AdminLayout.jsx';
import { useAuth } from './AdminApp.jsx';

export default function Account() {
  const { session } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return toast('New passwords do not match', 'error');
    try {
      await api.post('/api/admin/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <>
      <PageHeader title="My account" subtitle={`${session.admin.name} · ${session.admin.email}`} />
      <form onSubmit={submit} className="card max-w-md space-y-4 p-6">
        <h2 className="text-xl">Change password</h2>
        {[['currentPassword', 'Current password'], ['newPassword', 'New password (min 8 characters)'], ['confirm', 'Confirm new password']].map(([k, l]) => (
          <div key={k}>
            <label className="label" htmlFor={k}>{l}</label>
            <input id={k} type="password" required minLength={k === 'currentPassword' ? 1 : 8} className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </div>
        ))}
        <button className="btn-primary">Update password</button>
      </form>
    </>
  );
}
