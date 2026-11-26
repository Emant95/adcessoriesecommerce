import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { qs } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { dateTime } from '../../lib/format.js';
import Pagination from '../../components/Pagination.jsx';
import { Skeleton, EmptyState, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';

const TYPES = { STOCK_IN: 'Stock in', STOCK_OUT: 'Stock out', RETURN: 'Return', DAMAGED: 'Damaged', ADJUSTMENT: 'Adjustment' };

export default function Inventory() {
  const [f, setF] = useState({ search: '', type: '', from: '', to: '', page: 1 });
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useFetch(`/api/admin/inventory/movements${qs({ ...f, to: f.to ? `${f.to}T23:59:59` : '' })}`);
  return (
    <>
      <PageHeader title="Stock history" subtitle="Every stock change, who made it and why. Record new changes from a product's page." />
      <div className="card mb-5 flex flex-wrap gap-3 p-4">
        <form className="min-w-[200px] flex-1" onSubmit={(e) => { e.preventDefault(); setF({ ...f, search, page: 1 }); }}>
          <input className="input" placeholder="Search product or SKU" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        </form>
        <select className="input !w-auto" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, page: 1 })} aria-label="Type">
          <option value="">All types</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" className="input !w-auto" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} aria-label="From date" />
        <input type="date" className="input !w-auto" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} aria-label="To date" />
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data.items.length ? (
        <EmptyState icon={Boxes} title="No stock changes found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-taupe">
              <tr><th className="p-4">Date</th><th className="p-4">Product</th><th className="p-4">Type</th><th className="p-4">Change</th><th className="p-4">Before → after</th><th className="p-4">Reason / ref</th><th className="p-4">By</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap p-4 text-taupe">{dateTime(m.createdAt)}</td>
                  <td className="p-4"><Link to={`/admin/products/${m.product.id}`} className="hover:text-gold-dark">{m.product.name}</Link><p className="text-xs text-taupe">{m.product.sku}</p></td>
                  <td className="p-4">{TYPES[m.type]}</td>
                  <td className={`p-4 font-medium ${m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                  <td className="p-4">{m.before} → {m.after}</td>
                  <td className="p-4 text-taupe">{[m.reason, m.reference].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="p-4">{m.actor?.name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setF({ ...f, page })} />}
    </>
  );
}
